/*
 * XLSX read/write: a workbook using every documented feature, written and read
 * back through every I/O path, must come back as its recorded snapshot.
 */

import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import { kitchenSink, digest } from "./fixtures.mjs";
import { snapshot, withTempDir } from "./helpers.mjs";

describe("xlsx", () => {
    it("round-trips every workbook feature through a buffer", async () => {
        const result = await snapshot("xlsx/kitchen-sink-reread", async (excel) => {
            const buffer = await kitchenSink(excel).xlsx.writeBuffer();
            const reread = new excel.Workbook();
            await reread.xlsx.load(buffer);
            return digest(reread);
        });


        // Parity alone would pass if both sides lost a feature; pin the
        // headline ones so the comparison is known to cover something.
        const [ sheet ] = result.worksheets;
        assert.equal(sheet.name, "גיליון");
        assert.equal(sheet.views[0].rightToLeft, true);
        assert.deepEqual(sheet.merges.sort(), [ "A10:C11", "A12:C12" ]);
        assert.ok(Object.keys(sheet.dataValidations).includes("B2"));
        assert.equal(sheet.conditionalFormattings[0].rules.length, 4);
        assert.equal(result.media.length, 2);
        assert.equal(result.images[0].length, 3);
        assert.equal(result.tables[1][0].name, "Scores");
        assert.deepEqual(result.sheetNames.map(([ , name, state ]) => [ name, state ]), [
            [ "גיליון", "visible" ],
            [ "Data", "hidden" ],
        ]);
    });

    it("reads and writes files on disk", async () => {
        const result = await snapshot("xlsx/kitchen-sink-reread", (excel, label) =>
            withTempDir(async (dir) => {
                const file = join(dir, `${label}.xlsx`);
                await kitchenSink(excel).xlsx.writeFile(file);
                const reread = new excel.Workbook();
                await reread.xlsx.readFile(file);
                return digest(reread);
            }),
        );

    });

    it("reads a stream", async () => {
        const { Readable } = await import("node:stream");
        const result = await snapshot("xlsx/kitchen-sink-reread", async (excel) => {
            const buffer = Buffer.from(await kitchenSink(excel).xlsx.writeBuffer());
            const reread = new excel.Workbook();
            await reread.xlsx.read(Readable.from([ buffer ]));
            return digest(reread);
        });

    });

    it("writes a model through ModelContainer", async () => {
        const result = await snapshot("xlsx/kitchen-sink-reread", async (excel) => {
            const container = new excel.ModelContainer(kitchenSink(excel).model);
            const reread = new excel.Workbook();
            await reread.xlsx.load(await container.xlsx.writeBuffer());
            return digest(reread);
        });

        assert.equal(result.worksheets[0].name, "גיליון");
    });

    it("re-merges cells moved by insertRows", async () => {
        // excel detects merged cells with `constructor.name === "MergeValue"`.
        // A bundle minified without keepNames silently stops re-merging here:
        // B5 comes back as its own unmerged cell.
        const result = await snapshot("xlsx/re-merges-cells-moved-by-insertrows", (excel) => {
            const sheet = new excel.Workbook().addWorksheet("s");
            sheet.getCell("A3").value = "merged";
            sheet.mergeCells("A3:B3");
            sheet.insertRows(2, [ [ "x" ], [ "y" ] ]);
            const partner = sheet.getCell("B5");
            return { master: partner.master.address, isMerge: partner.type === excel.ValueType.Merge };
        });

        assert.deepEqual(result, { master: "A5", isMerge: true });
    });

    it("splices and duplicates rows", async () => {
        const result = await snapshot("xlsx/splices-and-duplicates-rows", (excel) => {
            const sheet = new excel.Workbook().addWorksheet("s");
            sheet.addRows([ [ 1, "a" ], [ 2, "b" ], [ 3, "c" ], [ 4, "d" ] ]);
            sheet.getCell("C2").value = "merged";
            sheet.mergeCells("C2:D3");
            sheet.duplicateRow(1, 2, true);
            sheet.spliceRows(4, 1, [ "new" ]);
            sheet.spliceColumns(2, 1);
            return {
                values: sheet.getSheetValues().map((row) => row?.slice(1) ?? null),
                types: sheet.getSheetValues().map((_row, r) => (r ? [ 1, 2, 3 ].map((c) => sheet.getCell(r, c).type) : null)),
            };
        });

    });

    it("protects worksheets", async () => {
        const result = await snapshot("xlsx/protects-worksheets", async (excel) => {
            const workbook = new excel.Workbook();
            const sheet = workbook.addWorksheet("locked");
            await sheet.protect("secret", { selectLockedCells: false, formatCells: true, spinCount: 1000 });
            const reread = new excel.Workbook();
            await reread.xlsx.load(await workbook.xlsx.writeBuffer());
            const { sheetProtection } = reread.worksheets[0].model;
            // The salt is random by design; everything else must agree.
            const { saltValue, hashValue, ...rest } = sheetProtection;
            return { ...rest, hasSalt: Boolean(saltValue), hasHash: Boolean(hashValue) };
        });

        assert.equal(result.sheet, true);
        assert.equal(result.hasHash, true);
    });
});
