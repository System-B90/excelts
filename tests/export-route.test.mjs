/*
 * The surface a typical export route uses -- one sheet, keyed columns, styled
 * rows, merged headers, a buffer for the download -- exercised through the
 * published entry point, with right-to-left text throughout.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Workbook } from "@system-b90/excelts";

/** Builds a workbook using every surface an export route relies on. */
function buildProbeWorkbook() {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("גיליון");

    sheet.columns = [
        { header: "נושא", key: "topic", width: 32 },
        { header: "שעות", key: "hours", width: 10 },
    ];

    const row = sheet.addRow({ topic: "מבוא", hours: 2.75 });

    const cell = row.getCell(1);
    cell.font = { bold: true, size: 12, color: { argb: "FF0D2336" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCDEAF0" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    };
    row.getCell(2).numFmt = "0.00";

    sheet.mergeCells("A3:B3");
    sheet.getCell("A3").value = "כותרת מאוחדת";
    sheet.getRow(1).height = 22;

    return { workbook, sheet };
}

async function reread(workbook) {
    const copy = new Workbook();
    await copy.xlsx.load(Buffer.from(await workbook.xlsx.writeBuffer()));
    return copy.getWorksheet("גיליון");
}

describe("the surface an export route uses", () => {
    it("exposes Workbook as a constructible runtime value", () => {
        assert.equal(typeof Workbook, "function");
        assert.ok(new Workbook() instanceof Workbook);
    });

    it("creates worksheets and sets column widths", () => {
        const { workbook, sheet } = buildProbeWorkbook();

        assert.equal(workbook.worksheets.length, 1);
        assert.equal(sheet.name, "גיליון");
        assert.equal(sheet.getColumn(1).width, 32);
    });

    it("writes row values addressable by key and by index", () => {
        const { sheet } = buildProbeWorkbook();

        assert.equal(sheet.getRow(2).getCell(1).value, "מבוא");
        assert.equal(sheet.getRow(2).getCell("hours").value, 2.75);
    });

    it("retains every style property the export sets", () => {
        const { sheet } = buildProbeWorkbook();
        const cell = sheet.getRow(2).getCell(1);

        assert.equal(cell.font.bold, true);
        assert.equal(cell.font.color.argb, "FF0D2336");
        assert.equal(cell.fill.type, "pattern");
        assert.equal(cell.fill.pattern, "solid");
        assert.equal(cell.alignment.horizontal, "center");
        assert.equal(cell.alignment.wrapText, true);
        assert.equal(cell.border.top.style, "thin");
        assert.equal(sheet.getRow(2).getCell(2).numFmt, "0.00");
    });

    it("merges cells across a range", () => {
        const { sheet } = buildProbeWorkbook();

        assert.equal(sheet.getCell("A3").value, "כותרת מאוחדת");
        // The merged partner reads through to the master cell.
        assert.equal(sheet.getCell("B3").value, "כותרת מאוחדת");
    });

    it("sets row height", () => {
        const { sheet } = buildProbeWorkbook();

        assert.equal(sheet.getRow(1).height, 22);
    });

    it("writes a real xlsx buffer", async () => {
        const { workbook } = buildProbeWorkbook();
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

        // xlsx is a zip: "PK" magic. A truncated or HTML error payload fails
        // here rather than in the user's Excel.
        assert.equal(buffer.subarray(0, 2).toString("latin1"), "PK");
        assert.ok(buffer.length > 1000);
    });

    it("round-trips Hebrew text through the written file", async () => {
        // Right-to-left text has to survive the file format intact.
        const sheet = await reread(buildProbeWorkbook().workbook);

        assert.equal(sheet.getRow(2).getCell(1).value, "מבוא");
        assert.equal(sheet.getCell("A3").value, "כותרת מאוחדת");
    });

    it("preserves styling through a write/read round trip", async () => {
        const cell = (await reread(buildProbeWorkbook().workbook)).getRow(2).getCell(1);

        assert.equal(cell.font.bold, true);
        assert.equal(cell.alignment.horizontal, "center");
    });
});
