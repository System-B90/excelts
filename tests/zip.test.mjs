/*
 * The zip the non-streaming writer produces: valid to independent readers,
 * with every entry byte-for-byte intact.
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { bundle } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const workbookWith = (rows) => {
    const workbook = new bundle.Workbook();
    const sheet = workbook.addWorksheet("שם");
    for (let i = 0; i < rows; i++) sheet.addRow([ `row ${i}`, i, "ü€😀" ]);
    return workbook;
};

describe("zip output", () => {
    for (const options of [ undefined, { compression: "STORE" }, { compression: "DEFLATE", compressionOptions: { level: 1 } } ]) {
        it(`is a valid archive (${JSON.stringify(options) ?? "defaults"})`, async () => {
            const buffer = Buffer.from(await workbookWith(500).xlsx.writeBuffer({ zip: options }));

            // checkCRC32 makes JSZip verify every entry's checksum against its data.
            const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
            const names = Object.keys(zip.files).sort();
            assert.ok(names.includes("[Content_Types].xml") && names.includes("xl/worksheets/sheet1.xml"), names.join());

            const sheetXml = await zip.file("xl/worksheets/sheet1.xml").async("string");
            assert.match(sheetXml, /<row r="500"/);

            // And the library reads back what it wrote.
            const reread = new bundle.Workbook();
            await reread.xlsx.load(buffer);
            assert.equal(reread.worksheets[0].name, "שם");
            assert.deepEqual(reread.worksheets[0].getRow(500).values.slice(1), [ "row 499", 499, "ü€😀" ]);
        });
    }

    it("stores when asked and deflates by default", async () => {
        const stored = Buffer.from(await workbookWith(2000).xlsx.writeBuffer({ zip: { compression: "STORE" } }));
        const deflated = Buffer.from(await workbookWith(2000).xlsx.writeBuffer());

        assert.ok(deflated.length < stored.length / 3, `${deflated.length} vs ${stored.length}`);
    });

    it("packs media given as base64 and as a buffer, unchanged", async () => {
        const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "base64",
        );
        const workbook = workbookWith(1);
        const sheet = workbook.worksheets[0];
        sheet.addImage(workbook.addImage({ buffer: png, extension: "png" }), "A3:B4");
        sheet.addImage(workbook.addImage({ base64: `data:image/png;base64,${png.toString("base64")}`, extension: "png" }), "D3:E4");

        const zip = await JSZip.loadAsync(Buffer.from(await workbook.xlsx.writeBuffer()), { checkCRC32: true });
        const media = Object.keys(zip.files).filter((n) => n.startsWith("xl/media/") && !zip.files[n].dir);

        assert.equal(media.length, 2);
        for (const name of media) assert.deepEqual(await zip.file(name).async("nodebuffer"), png);
    });
});
