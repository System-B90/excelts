/*
 * Shared fixtures for the test suites.
 *
 * Most suites are snapshot suites: each scenario runs against the built
 * bundle, and its result -- a workbook re-read in full, CSV text, the rows a
 * streaming read yields -- must equal the snapshot recorded for it under
 * tests/snapshots/. A snapshot is the package's observable behaviour, so a
 * change to one is a behaviour change: record it deliberately
 * (`npm run test:update-snapshots`) and review the diff like code.
 */

// First, before anything reads a date: snapshots are compared across
// machines, and date formatting must not depend on where they run.
process.env.TZ = "UTC";

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export const bundle = require("../dist/index.cjs");

const SNAPSHOTS = fileURLToPath(new URL("./snapshots/", import.meta.url));
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

/** Fixed so that created/modified stamps cannot differ between runs. */
export const FIXED_DATE = new Date(Date.UTC(2026, 9, 23, 8, 30));

/** A 1x1 PNG, for the image features. */
export const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
);

/** Keys the library fills with a fresh random GUID on every write. */
const RANDOM_KEYS = new Set([ "x14Id" ]);

/**
 * Makes a result storable as a snapshot: Dates become ISO strings, Buffers
 * become base64, random GUIDs are masked, undefined members disappear.
 */
export function normalize(value) {
    return JSON.parse(
        JSON.stringify(value, (key, v) => {
            if (RANDOM_KEYS.has(key) && typeof v === "string") return "<random guid>";
            if (v && v.type === "Buffer" && Array.isArray(v.data)) return `base64:${Buffer.from(v.data).toString("base64")}`;
            return v;
        }),
    );
}

/**
 * Runs `scenario` against the bundle and checks its normalised result against
 * the snapshot called `name`, returning the result for further assertions.
 * With UPDATE_SNAPSHOTS=1 it records the snapshot instead.
 */
export async function snapshot(name, scenario) {
    const actual = normalize(await scenario(bundle, "excelts"));
    const file = join(SNAPSHOTS, `${name}.json`);
    if (UPDATE) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
        return actual;
    }
    if (!existsSync(file)) {
        throw new Error(
            `No snapshot "${name}". Record it with \`npm run test:update-snapshots\` and review the new file.`,
        );
    }
    assert.deepEqual(actual, JSON.parse(readFileSync(file, "utf8")), `behaviour differs from snapshot "${name}"`);
    return actual;
}

/** A scratch directory, removed after `fn` settles. */
export async function withTempDir(fn) {
    const dir = mkdtempSync(join(tmpdir(), "excelts-test-"));
    try {
        return await fn(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/** Entry names of a zip, in archive order, read from its central directory. */
export function zipEntryNames(buffer) {
    let eocd = buffer.length - 22;
    while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
    if (eocd < 0) throw new Error("Not a zip: no end-of-central-directory record");
    const count = buffer.readUInt16LE(eocd + 10);
    let offset = buffer.readUInt32LE(eocd + 16);
    const names = [];
    for (let i = 0; i < count; i++) {
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        names.push(buffer.toString("utf8", offset + 46, offset + 46 + nameLength));
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return names;
}
