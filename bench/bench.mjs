/*
 * Name: bench.mjs
 * Purpose: Times the paths real exports and imports spend their time in.
 * Created: 2026-11-08
 * Author: Michael K. Steinberg
 *
 * Usage: npm run build && npm run bench
 *
 * Each case runs after a warm-up, and reports the median of several runs, so a
 * change is judged on a number rather than a feeling.
 */

import { createRequire } from "node:module";
import { PassThrough, Readable } from "node:stream";

const require = createRequire(import.meta.url);
const { Workbook, stream } = require("../dist/index.cjs");

const ROWS = 20_000;
const COLS = 10;
const RUNS = 5;

const rowOf = (i) => Array.from({ length: COLS }, (_, c) => (c % 3 === 0 ? `row ${i} col ${c}` : c % 3 === 1 ? i * c : new Date(1_700_000_000_000 + i * 60_000)));

function buildWorkbook({ styled }) {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("data");
    for (let i = 0; i < ROWS; i++) {
        const row = sheet.addRow(rowOf(i));
        if (styled && i % 2 === 0) row.font = { bold: true };
    }
    return workbook;
}

async function median(name, fn) {
    await fn();
    const times = [];
    for (let i = 0; i < RUNS; i++) {
        const start = process.hrtime.bigint();
        await fn();
        times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    times.sort((a, b) => a - b);
    console.log(`${name.padEnd(34)} ${times[Math.floor(RUNS / 2)].toFixed(0).padStart(6)} ms`);
    return times[Math.floor(RUNS / 2)];
}

const cases = {};
const built = buildWorkbook({ styled: false });
const buffer = Buffer.from(await built.xlsx.writeBuffer());
const csv = Buffer.from(await built.csv.writeBuffer());

cases["build: addRow x20k"] = () => buildWorkbook({ styled: false });
cases["build: addRow + row styles"] = () => buildWorkbook({ styled: true });
cases["xlsx.writeBuffer"] = () => built.xlsx.writeBuffer();
cases["xlsx.load (buffer)"] = async () => new Workbook().xlsx.load(buffer);
cases["csv.writeBuffer"] = () => built.csv.writeBuffer();
cases["csv.read"] = async () => new Workbook().csv.read(Readable.from([ csv ]));
cases["stream: write 20k rows"] = async () => {
    const sink = new PassThrough();
    sink.resume();
    const writer = new stream.xlsx.WorkbookWriter({ stream: sink, useSharedStrings: true, useStyles: true });
    const sheet = writer.addWorksheet("data");
    for (let i = 0; i < ROWS; i++) sheet.addRow(rowOf(i)).commit();
    sheet.commit();
    await writer.commit();
};
cases["stream: read 20k rows"] = async () => {
    const reader = new stream.xlsx.WorkbookReader(Readable.from([ buffer ]), { sharedStrings: "cache", styles: "cache" });
    for await (const sheet of reader) for await (const row of sheet) void row;
};

const only = process.argv[2];
console.log(`node ${process.version}, ${ROWS} rows x ${COLS} cols, median of ${RUNS}\n`);
const total = [];
for (const [name, fn] of Object.entries(cases)) if (!only || name.includes(only)) total.push(await median(name, fn));
console.log(`${"total".padEnd(34)} ${total.reduce((a, b) => a + b, 0).toFixed(0).padStart(6)} ms`);
