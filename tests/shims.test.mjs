/*
 * The two shims, tested directly from src/ (they are also exercised through
 * the bundle by streaming.test.mjs).
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const tmp = require("../src/shims/tmp.cjs");
const unreachable = require("../src/shims/unreachable.cjs");

const file = () =>
    new Promise((resolve, reject) => {
        tmp.file((err, path, fd, cleanup) => (err ? reject(err) : resolve({ path, fd, cleanup })));
    });

describe("tmp shim", () => {
    it("creates an empty, owner-only file in its own directory under the OS temp dir", async () => {
        const { path, fd, cleanup } = await file();
        try {
            assert.ok(path.startsWith(tmpdir()), path);
            assert.equal(typeof fd, "number");
            assert.equal(readFileSync(path, "utf8"), "");
            if (process.platform !== "win32") {
                assert.equal(statSync(path).mode & 0o777, 0o600);
                assert.equal(statSync(dirname(path)).mode & 0o777, 0o700);
            }
        } finally {
            cleanup();
        }
    });

    it("hands out a distinct file every time", async () => {
        const [ a, b ] = await Promise.all([ file(), file() ]);
        assert.notEqual(dirname(a.path), dirname(b.path));
        a.cleanup();
        b.cleanup();
    });

    it("removes the file and its directory on cleanup, once, then calls back", async () => {
        const { path, cleanup } = await file();
        let calls = 0;
        cleanup(() => calls++);
        cleanup(() => calls++);

        assert.equal(existsSync(dirname(path)), false);
        assert.equal(calls, 2, "a repeated cleanup is a no-op that still calls back");
    });

    it("sweeps files nobody cleaned up when the process exits", () => {
        const shim = fileURLToPath(new URL("../src/shims/tmp.cjs", import.meta.url));
        const leaked = execFileSync(
            process.execPath,
            [
                "-e",
                `const tmp = require(${JSON.stringify(shim)});
                 tmp.setGracefulCleanup();
                 tmp.setGracefulCleanup();
                 tmp.file((err, path) => { if (err) throw err; console.log(path); });`,
            ],
            { encoding: "utf8" },
        ).trim();

        assert.ok(leaked.length > 0);
        assert.equal(existsSync(dirname(leaked)), false);
    });
});

describe("unreachable stub", () => {
    const stub = unreachable("fstream");

    it("loads, and lets dependencies read properties at load time", () => {
        // unzipper does `require("fstream").Writer` when it is loaded.
        assert.equal(typeof stub.Writer, "function");
        assert.equal(stub.__esModule, false);
    });

    it("throws, naming the module, the moment anything is used", () => {
        const expected = /'fstream' is not bundled/;
        assert.throws(() => stub(), expected);
        assert.throws(() => new stub.Writer(), expected);
        assert.throws(() => stub.Reader({ path: "." }), expected);
    });
});
