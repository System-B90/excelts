/*
 * Name: check-turbopack.mjs
 * Purpose: Builds and runs a real Next.js app against the packed package, the
 *          only faithful check that Turbopack can trace the bundle.
 * Created: 2026-10-23
 * Author: Michael K. Steinberg
 *
 * Usage: npm run build && npm run test:turbopack [-- --keep]
 *
 * Dynamic `path.resolve` / `fs` calls inside a bundled file make Turbopack's
 * file tracer give up and trace the bundle's whole directory -- which, for a
 * bundle vendored inside an app, is the whole app. Measured on
 * an unstubbed build of this package: every file under the package lands in
 * the route's .nft.json. With the shims in place, none does, because the
 * bundle is compiled into the route's chunk and nothing in it reaches back
 * out to the filesystem around it.
 *
 * So this check fails when:
 *   1. `next build` fails (e.g. "dynamic usage of require" from an ESM shim),
 *   2. any route's trace includes a file from this package, or
 *   3. the standalone server cannot serve an xlsx, or stream one back.
 */

import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Pinned so a Next release cannot change this check's verdict on its own. */
const NEXT_VERSION = "16.4.3";
const REACT_VERSION = "19.3.1";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(ROOT, "tests", "turbopack");
const keep = process.argv.includes("--keep");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (!existsSync(join(ROOT, "dist", "index.cjs"))) {
    throw new Error("dist/ is missing. Run `npm run build` first.");
}

const { name } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const work = mkdtempSync(join(tmpdir(), "excelts-turbopack-"));
const run = (cmd, args, opts = {}) =>
    execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

function freePort() {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

async function waitFor(url, child, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(`Standalone server exited with ${child.exitCode}`);
        try {
            return await fetch(url);
        } catch {
            await new Promise((r) => setTimeout(r, 250));
        }
    }
    throw new Error(`Standalone server did not answer ${url} within ${timeoutMs}ms`);
}

/** Every `.nft.json` under a directory, recursively. */
function traces(dir) {
    return readdirSync(dir, { withFileTypes: true, recursive: true })
        .filter((e) => e.isFile() && e.name.endsWith(".nft.json"))
        .map((e) => join(e.parentPath ?? e.path, e.name));
}

try {
    run(npm, [ "pack", "--pack-destination", work ], { cwd: ROOT });
    const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));

    const app = join(work, "app");
    cpSync(FIXTURE, app, { recursive: true });
    writeFileSync(
        join(app, "package.json"),
        JSON.stringify(
            {
                private: true,
                dependencies: {
                    [name]: `file:../${tarball}`,
                    next: NEXT_VERSION,
                    react: REACT_VERSION,
                    "react-dom": REACT_VERSION,
                },
            },
            null,
            4,
        ),
    );

    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
    run(npm, [ "install", "--no-audit", "--no-fund", "--loglevel=error" ], { cwd: app, env });
    run(process.execPath, [ join(app, "node_modules", "next", "dist", "bin", "next"), "build" ], { cwd: app, env });

    // 2. Nothing in this package may be traced: it all lives in the chunk.
    const packageDir = `node_modules/${name}/`;
    const leaks = traces(join(app, ".next", "server")).flatMap((trace) =>
        JSON.parse(readFileSync(trace, "utf8"))
            .files.filter((f) => f.replaceAll("\\", "/").includes(packageDir))
            .map((f) => `${trace.slice(app.length + 1)}: ${f}`),
    );
    if (leaks.length > 0) {
        throw new Error(
            `Turbopack traced ${leaks.length} file(s) from ${name} (#777):\n  ${leaks.join("\n  ")}`,
        );
    }
    console.log(`✓ No route traces any file from ${name}`);

    // 3. The standalone output actually works.
    const port = await freePort();
    const server = spawn(process.execPath, [ join(app, ".next", "standalone", "server.js") ], {
        env: { ...env, PORT: String(port), HOSTNAME: "127.0.0.1" },
        stdio: "inherit",
    });
    try {
        const xlsx = await waitFor(`http://127.0.0.1:${port}/xlsx`, server);
        const body = Buffer.from(await xlsx.arrayBuffer());
        if (xlsx.status !== 200 || body.subarray(0, 2).toString("latin1") !== "PK") {
            throw new Error(`/xlsx returned ${xlsx.status} and no zip (${body.length} bytes)`);
        }
        console.log(`✓ /xlsx served a ${body.length}-byte workbook`);

        const roundtrip = await fetch(`http://127.0.0.1:${port}/roundtrip`);
        const rows = await roundtrip.json();
        const expected = [ [ "shared", "strings" ], [ "שלום", 7 ] ];
        if (JSON.stringify(rows) !== JSON.stringify(expected)) {
            throw new Error(`/roundtrip returned ${JSON.stringify(rows)}, expected ${JSON.stringify(expected)}`);
        }
        console.log("✓ /roundtrip streamed the workbook back through the temp-file path");
    } finally {
        server.kill();
    }
} finally {
    if (keep) console.log(`Kept ${work}`);
    else rmSync(work, { recursive: true, force: true });
}
