/*
 * The package as published: its export surface, its self-containment, and
 * the paperwork (notices, provenance) that ships with it.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, readFileSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PATCHES } from "../scripts/patches.mjs";
import { snapshot, withTempDir } from "./helpers.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const provenance = JSON.parse(readFileSync(join(ROOT, "dist", "provenance.json"), "utf8"));
const source = readFileSync(join(ROOT, "dist", "index.cjs"), "utf8");

/** Enum objects, compared by value; everything else by kind. */
const shape = (api) =>
    Object.fromEntries(
        Object.entries(api).map(([ key, value ]) => [
            key,
            typeof value === "function" ? "function" : key === "stream" ? Object.keys(value.xlsx).sort() : value,
        ]),
    );

describe("exports", () => {
    // Imported through the package's own name, so the `exports` map is what
    // resolves them -- exactly as a consumer's require/import would.
    const cjs = require(manifest.name);

    it("exposes exactly the recorded runtime API", async () => {
        // Every export by kind, every enum by value, every streaming class.
        await snapshot("package/runtime-api", () => shape(cjs));
        assert.deepEqual(Object.keys(cjs).sort(), provenance.exports);
    });

    it("serves the same API to import, as named and default exports", async () => {
        const esm = await import(manifest.name);

        assert.equal(esm.default, cjs);
        for (const name of Object.keys(cjs)) assert.equal(esm[name], cjs[name], name);
        assert.deepEqual(
            Object.keys(esm).filter((k) => k !== "default").sort(),
            Object.keys(cjs).sort(),
        );
    });

    it("constructs workbooks that are instances of the exported class", () => {
        const workbook = new cjs.Workbook();
        assert.ok(workbook instanceof cjs.Workbook);
        assert.ok(new cjs.stream.xlsx.WorkbookWriter({}) instanceof cjs.stream.xlsx.WorkbookWriter);
    });

    it("keeps class names readable", () => {
        assert.equal(cjs.Workbook.name, "Workbook");
        assert.equal(new cjs.Workbook().addWorksheet("s").constructor.name, "Worksheet");
    });
});

describe("self-containment", () => {
    it("declares no dependencies of any kind", () => {
        for (const field of [ "dependencies", "peerDependencies", "optionalDependencies", "bundleDependencies", "bundledDependencies" ]) {
            assert.equal(manifest[field], undefined, `package.json must not declare ${field}`);
        }
    });

    it("requires nothing but Node builtins, and only by literal name", () => {
        const required = [ ...source.matchAll(/\brequire\(("[^"]*"|[^)]*)\)/g) ].map((m) => m[1]);
        const builtins = new Set(builtinModules.flatMap((m) => [ m, `node:${m}` ]));

        const dynamic = required.filter((r) => !r.startsWith('"'));
        assert.deepEqual(dynamic, [], "dynamic require() calls defeat bundlers' static analysis");
        const external = [ ...new Set(required.map((r) => JSON.parse(r))) ].filter((m) => !builtins.has(m));
        assert.deepEqual(external, []);
    });

    it("works from a directory with no node_modules anywhere near it", async () => {
        const output = await withTempDir(async (dir) => {
            cpSync(join(ROOT, "dist"), dir, { recursive: true });
            const script = `
                const excelts = require("./index.cjs");
                const { Readable } = require("node:stream");
                (async () => {
                    const wb = new excelts.Workbook();
                    wb.addWorksheet("s").addRows([["a", 1], ["b", 2]]);
                    const xlsx = Buffer.from(await wb.xlsx.writeBuffer());
                    const csv = Buffer.from(await wb.csv.writeBuffer()).toString();
                    const rows = [];
                    const reader = new excelts.stream.xlsx.WorkbookReader(Readable.from([xlsx]), {});
                    for await (const sheet of reader) for await (const row of sheet) rows.push(row.values.slice(1));
                    console.log(JSON.stringify({ csv, rows }));
                })();
            `;
            return execFileSync(process.execPath, [ "-e", script ], {
                cwd: dir,
                env: { ...process.env, NODE_PATH: "" },
                encoding: "utf8",
            });
        });

        assert.deepEqual(JSON.parse(output), { csv: "a,1\nb,2", rows: [ [ "a", 1 ], [ "b", 2 ] ] });
    });

    it("leaves out the unreachable modules", () => {
        const bundled = new Set(provenance.bundledPackages.map((p) => p.name));
        // rimraf and traverse only ever arrive through tmp and chainsaw; temp
        // files come from src/shims/tmp.cjs instead.
        for (const name of [ ...provenance.unreachable, "tmp", "rimraf", "traverse" ]) {
            assert.equal(bundled.has(name), false, `${name} should not be in the bundle`);
        }
        assert.deepEqual(provenance.patches, PATCHES.map(({ id, module }) => ({ id, module })));
    });

    it("bundles each runtime library at exactly its pinned version", () => {
        const tooling = new Set([ "@types/node", "esbuild", "typescript" ]);
        const runtime = Object.entries(manifest.devDependencies).filter(([ name ]) => !tooling.has(name));
        const bundled = new Set(provenance.bundledPackages.map(({ name, version }) => `${name}@${version}`));

        assert.ok(runtime.length > 0);
        for (const [ name, version ] of runtime) assert.ok(bundled.has(`${name}@${version}`), `${name}@${version}`);
    });
});

describe("published files", () => {
    it("ships exactly the built entry points, types and notices", () => {
        const [ { files } ] = JSON.parse(
            execFileSync("npm", [ "pack", "--dry-run", "--json", "--ignore-scripts" ], {
                cwd: ROOT,
                encoding: "utf8",
                shell: process.platform === "win32",
            }),
        );

        assert.deepEqual(files.map((f) => f.path).sort(), [
            "LICENSE",
            "README.md",
            "dist/THIRD_PARTY_NOTICES.md",
            "dist/index.cjs",
            "dist/index.d.cts",
            "dist/index.d.mts",
            "dist/index.mjs",
            "dist/provenance.json",
            "dist/types.d.ts",
            "package.json",
        ]);
    });

    it("records provenance that matches the bundle", () => {
        const bytes = readFileSync(join(ROOT, "dist", "index.cjs"));

        assert.equal(provenance.bundleBytes, bytes.length);
        assert.equal(provenance.bundleSha256, createHash("sha256").update(bytes).digest("hex"));
    });

    it("carries a licence notice for every bundled package", () => {
        const notices = readFileSync(join(ROOT, "dist", "THIRD_PARTY_NOTICES.md"), "utf8");
        const headings = [ ...notices.matchAll(/^## (.+)$/gm) ].map((m) => m[1]);

        assert.deepEqual(headings, provenance.bundledPackages.map((p) => `${p.name}@${p.version}`));
        for (const { name, version, license } of provenance.bundledPackages) {
            assert.ok(notices.includes(`## ${name}@${version}\n\nLicense: ${license}`), name);
        }
    });
});
