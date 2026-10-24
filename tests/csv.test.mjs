/*
 * CSV: writing and reading CSV, options included, against recorded snapshots.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, it } from "node:test";

import { FIXED_DATE, snapshot, withTempDir } from "./helpers.mjs";

function csvWorkbook(excel) {
    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("csv");
    sheet.addRows([
        [ "topic", "hours", "when", "done", "note" ],
        [ "מבוא", 2.75, FIXED_DATE, true, 'has "quotes", commas' ],
        [ "multi\nline", 0, FIXED_DATE, false, null ],
        [ "formula", { formula: "B2*2", result: 5.5 }, null, null, { text: "link", hyperlink: "https://example.com" } ],
    ]);
    return workbook;
}

/** A re-read sheet's values, rows and columns 1-based as excel reports them. */
const valuesOf = (workbook) => workbook.worksheets[0].getSheetValues().map((row) => row?.slice(1) ?? null);

describe("csv", () => {
    it("writes and reads buffers", async () => {
        const result = await snapshot("csv/writes-and-reads-buffers", async (excel) => {
            const buffer = Buffer.from(
                await csvWorkbook(excel).csv.writeBuffer({
                    dateFormat: "YYYY-MM-DD HH:mm",
                    dateUTC: true,
                    formatterOptions: { delimiter: ";", quoteColumns: true },
                }),
            );
            const reread = new excel.Workbook();
            await reread.csv.read(Readable.from([ buffer ]), {
                dateFormats: [ "YYYY-MM-DD HH:mm" ],
                parserOptions: { delimiter: ";" },
            });
            return { text: buffer.toString("utf8"), values: valuesOf(reread) };
        });

        assert.match(result.text, /^"topic";"hours"/);
        assert.equal(result.values[2][0], "מבוא");
        assert.equal(result.values[2][2], FIXED_DATE.toISOString());
    });

    it("writes and reads files with mapping and sheet options", async () => {
        const result = await snapshot("csv/writes-and-reads-files-with-mapping-and-sheet-options", (excel, label) =>
            withTempDir(async (dir) => {
                const file = join(dir, `${label}.csv`);
                const workbook = csvWorkbook(excel);
                workbook.addWorksheet("second").addRow([ "only", "this" ]);
                await workbook.csv.writeFile(file, { sheetName: "second", includeEmptyRows: false });
                const written = readFileSync(file, "utf8");

                await csvWorkbook(excel).csv.writeFile(file, {
                    map: (value) => (typeof value === "number" ? value * 10 : value),
                });
                const reread = new excel.Workbook();
                await reread.csv.readFile(file, {
                    sheetName: "imported",
                    map: (value, index) => (index === 0 ? String(value).toUpperCase() : value),
                });
                return { written, name: reread.worksheets[0].name, values: valuesOf(reread) };
            }),
        );

        assert.equal(result.written.trim(), "only,this");
        assert.equal(result.name, "imported");
        assert.equal(result.values[1][0], "TOPIC");
    });

    it("streams CSV out through write()", async () => {
        const { PassThrough } = await import("node:stream");
        const result = await snapshot("csv/streams-csv-out-through-write", async (excel) => {
            const sink = new PassThrough();
            const chunks = [];
            sink.on("data", (chunk) => chunks.push(chunk));
            await csvWorkbook(excel).csv.write(sink, { dateFormat: "DD/MM/YYYY", dateUTC: true });
            return Buffer.concat(chunks).toString("utf8");
        });

        assert.match(result, /23\/10\/2026/);
    });
});
