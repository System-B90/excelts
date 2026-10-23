/*
 * Streaming: stream.xlsx.WorkbookWriter and WorkbookReader.
 *
 * The library's own writer puts worksheets before xl/sharedStrings.xml, so
 * reading its output always takes the reader's temp-file path
 * (src/shims/tmp.cjs) -- these tests assert that it does.
 */

import assert from "node:assert/strict";
import fs, { existsSync } from "node:fs";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { describe, it } from "node:test";

import { digest, kitchenSink } from "./fixtures.mjs";
import { bundle, FIXED_DATE, snapshot, withTempDir, zipEntryNames } from "./helpers.mjs";

/** Writes a streamed workbook with every feature the streaming writer supports. */
async function streamWorkbook(excel, options) {
    const workbook = new excel.stream.xlsx.WorkbookWriter({ useStyles: true, useSharedStrings: true, ...options });
    workbook.creator = "System-B90";
    workbook.created = FIXED_DATE;
    workbook.modified = FIXED_DATE;

    const sheet = workbook.addWorksheet("זרם", {
        properties: { tabColor: { argb: "FF3397AB" } },
        views: [ { rightToLeft: true, state: "frozen", ySplit: 1 } ],
    });
    sheet.columns = [
        { header: "topic", key: "topic", width: 30 },
        { header: "hours", key: "hours", width: 10, style: { numFmt: "0.00" } },
        { header: "when", key: "when", width: 14 },
    ];
    for (let i = 0; i < 50; i++) {
        const row = sheet.addRow({ topic: `שורה ${i}`, hours: i / 4, when: FIXED_DATE });
        if (i % 10 === 0) row.font = { bold: true, color: { argb: "FF0D2336" } };
        // Rows are immutable once committed, so cell-level features go first.
        if (i === 0) row.getCell(2).dataValidation = { type: "decimal", operator: "greaterThan", formulae: [ 0 ] };
        row.commit();
    }
    const last = sheet.addRow([ { text: "link", hyperlink: "https://example.com" }, { formula: "SUM(B2:B51)", result: 306.25 } ]);
    last.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCDEAF0" } };
    last.commit();
    sheet.mergeCells("A53:C53");
    sheet.getCell("A53").value = "merged";
    sheet.autoFilter = "A1:C1";
    sheet.commit();

    workbook.addWorksheet("second").addRow([ "x", 1 ]).commit();
    await workbook.commit();
    return workbook;
}

const rereadFile = async (excel, file) => {
    const workbook = new excel.Workbook();
    await workbook.xlsx.readFile(file);
    return digest(workbook);
};

/** Iterates a WorkbookReader the documented way, collecting everything it yields. */
async function readAll(reader) {
    const sheets = [];
    for await (const worksheet of reader) {
        const rows = [];
        for await (const row of worksheet) {
            rows.push({ number: row.number, values: row.values, font: row.getCell(1).font ?? null });
        }
        sheets.push({ id: worksheet.id, name: worksheet.name, rows });
    }
    return sheets;
}

describe("stream.xlsx.WorkbookWriter", () => {
    it("streams to a file", async () => {
        const result = await snapshot("streaming/streamed-workbook-reread", (excel, label) =>
            withTempDir(async (dir) => {
                const filename = join(dir, `${label}.xlsx`);
                await streamWorkbook(excel, { filename });
                return rereadFile(excel, filename);
            }),
        );

        const [ sheet ] = result.worksheets;
        assert.equal(sheet.name, "זרם");
        assert.deepEqual(sheet.merges, [ "A53:C53" ]);
        assert.equal(sheet.rows.length, 53);
    });

    it("streams to a writable stream", async () => {
        const result = await snapshot("streaming/streamed-workbook-reread", async (excel) => {
            const sink = new PassThrough();
            const chunks = [];
            sink.on("data", (chunk) => chunks.push(chunk));
            await streamWorkbook(excel, { stream: sink });
            const workbook = new excel.Workbook();
            await workbook.xlsx.load(Buffer.concat(chunks));
            return digest(workbook);
        });

    });
});

describe("stream.xlsx.WorkbookReader", () => {
    const options = { worksheets: "emit", sharedStrings: "cache", hyperlinks: "cache", styles: "cache" };

    it("reads worksheets that precede their shared strings (the temp-file path)", async () => {
        const result = await snapshot("streaming/reads-worksheets-that-precede-their-shared-strings-the-temp-file-path", async (excel) => {
            const buffer = Buffer.from(await kitchenSink(excel).xlsx.writeBuffer());
            const names = zipEntryNames(buffer);
            const order = {
                sheetBeforeStrings: names.indexOf("xl/worksheets/sheet1.xml") < names.indexOf("xl/sharedStrings.xml"),
            };
            const reader = new excel.stream.xlsx.WorkbookReader(Readable.from([ buffer ]), options);
            return { order, sheets: await readAll(reader) };
        });

        assert.equal(result.order.sheetBeforeStrings, true);
        assert.equal(result.sheets[0].name, "גיליון");
        assert.equal(result.sheets[0].rows[1].values[1], "מבוא");
        assert.equal(result.sheets[0].rows[1].font.bold, true);
    });

    it("reads from a filename", async () => {
        const result = await snapshot("streaming/reads-from-a-filename", (excel, label) =>
            withTempDir(async (dir) => {
                const filename = join(dir, `${label}.xlsx`);
                await streamWorkbook(excel, { filename });
                return readAll(new excel.stream.xlsx.WorkbookReader(filename, options));
            }),
        );

        assert.equal(result[0].rows.length, 53);
        assert.equal(result[0].rows[1].values[1], "שורה 0");
    });

    it("supports the event API", async () => {
        const result = await snapshot("streaming/supports-the-event-api", async (excel) => {
            const buffer = Buffer.from(await kitchenSink(excel).xlsx.writeBuffer());
            const reader = new excel.stream.xlsx.WorkbookReader(Readable.from([ buffer ]), {
                ...options,
                entries: "emit",
            });
            const events = { entries: [], rows: [] };
            reader.on("entry", ({ type }) => events.entries.push(type));
            reader.on("worksheet", (worksheet) => {
                worksheet.on("row", (row) => events.rows.push([ worksheet.id, row.number, row.values ]));
            });
            await new Promise((resolve, reject) => {
                reader.on("end", resolve);
                reader.on("error", reject);
                reader.read();
            });
            return events;
        });

        assert.ok(result.rows.length > 5);
    });

    it("keeps every entry when parking a worksheet is slow", async () => {
        // scripts/patches.mjs, "unzipper-premature-end". unzipper ended its
        // output as soon as the file was read in; excel stopped there, so a
        // worksheet that took a while to park in a temp file lost everything
        // after it -- sheets, shared strings, styles, names -- with no error.
        // Windows' and macOS's slower filesystems hit it in CI. A 50ms delay
        // made it happen on every read.
        await withTempDir(async (dir) => {
            const filename = join(dir, "slow.xlsx");
            await streamWorkbook(bundle, { filename });

            const original = fs.mkdtemp;
            fs.mkdtemp = (...args) => setTimeout(() => original(...args), 50);
            let sheets;
            try {
                sheets = await readAll(new bundle.stream.xlsx.WorkbookReader(filename, options));
            } finally {
                fs.mkdtemp = original;
            }

            assert.deepEqual(sheets.map((s) => s.name), [ "זרם", "second" ]);
            assert.equal(sheets[0].rows.length, 53);
            assert.equal(sheets[0].rows[1].values[1], "שורה 0");
            assert.equal(sheets[0].rows[1].font.bold, true);
            assert.deepEqual(sheets[1].rows[0].values.slice(1), [ "x", 1 ]);
        });
    });

    it("reads a zip whose central directory is missing", async () => {
        // The second hunk of the same patch. The premature 'end' also hid the
        // FILE_ENDED error such files raise; fixing the 'end' alone made every
        // one of them throw, where the reader had always read them fine.
        const buffer = Buffer.from(await kitchenSink(bundle).xlsx.writeBuffer());
        let eocd = buffer.length - 22;
        while (buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
        const entriesOnly = buffer.subarray(0, buffer.readUInt32LE(eocd + 16));

        const sheets = await readAll(new bundle.stream.xlsx.WorkbookReader(Readable.from([ entriesOnly ]), options));

        assert.deepEqual(sheets.map((s) => s.name), [ "גיליון", "Data" ]);
    });

    it("parks worksheets in temp files and removes every one of them", async () => {
        // The bundle's tmp shim calls fs.mkdtemp through the shared `fs`
        // module object, so wrapping it here observes the shim directly.
        const created = [];
        const original = fs.mkdtemp;
        fs.mkdtemp = (prefix, ...rest) => {
            const callback = rest.pop();
            original(prefix, ...rest, (err, dir) => {
                if (!err) created.push(dir);
                callback(err, dir);
            });
        };
        try {
            const buffer = Buffer.from(await kitchenSink(bundle).xlsx.writeBuffer());
            const sheets = await readAll(new bundle.stream.xlsx.WorkbookReader(Readable.from([ buffer ]), options));
            assert.equal(sheets.length, 2);
        } finally {
            fs.mkdtemp = original;
        }

        assert.equal(created.length, 2, "one temp file per worksheet read ahead of its shared strings");
        // Immediate on POSIX; on Windows the shim may retry for a moment
        // while excel's read stream lets go of the file.
        const deadline = Date.now() + 2000;
        while (created.some(existsSync) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
        for (const dir of created) assert.equal(existsSync(dir), false, `${dir} was left behind`);
    });
});
