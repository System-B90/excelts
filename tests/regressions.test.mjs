/*
 * Bugs found in code this package inherited, each pinned by a test that fails
 * without its fix. (The streaming reader's two fixes live in
 * streaming.test.mjs, beside the rest of the reader's tests.)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bundle } from "./helpers.mjs";

describe("regressions", () => {
    it("writes a rich-text cell as CSV text", () => {
        // RichTextValue.toCsvString read `this.text`, which does not exist, so
        // the public cell.toCsvString() threw a TypeError for any rich-text cell.
        const sheet = new bundle.Workbook().addWorksheet("s");
        sheet.getCell("A1").value = { richText: [ { text: "hello " }, { text: 'wor"ld', font: { bold: true } } ] };

        assert.equal(sheet.getCell("A1").toCsvString(), '"hello wor""ld"');
    });

    it("keeps a table's displayName once it is set", () => {
        // The getter read `table.displyName` and the setter was named
        // `displayNamename`, so assigning displayName was lost (silently in
        // sloppy code, a TypeError in strict code) and it always read as `name`.
        const sheet = new bundle.Workbook().addWorksheet("s");
        sheet.addTable({ name: "Scores", ref: "A1", columns: [ { name: "a" } ], rows: [ [ 1 ] ] });
        const table = sheet.getTable("Scores");

        assert.equal(table.displayName, "Scores");
        table.displayName = "Shown";
        assert.equal(table.displayName, "Shown");
    });
});
