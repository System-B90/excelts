/*
 * Workbook fixtures shared by the snapshot suites.
 */

import { FIXED_DATE, PNG } from "./helpers.mjs";

/** A workbook touching every documented XLSX feature. */
export function kitchenSink(excel) {
    const workbook = new excel.Workbook();
    workbook.creator = "System-B90";
    workbook.lastModifiedBy = "tests";
    workbook.created = FIXED_DATE;
    workbook.modified = FIXED_DATE;
    workbook.lastPrinted = FIXED_DATE;
    workbook.title = "Kitchen sink";
    workbook.company = "System-B90";
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.views = [ { x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: "visible" } ];

    const sheet = workbook.addWorksheet("גיליון", {
        properties: { tabColor: { argb: "FF3397AB" }, defaultRowHeight: 18 },
        views: [ { rightToLeft: true, state: "frozen", xSplit: 1, ySplit: 1 } ],
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, printTitlesRow: "1:1" },
        headerFooter: { oddHeader: "&CExport", oddFooter: "&P / &N" },
    });

    sheet.columns = [
        { header: "נושא", key: "topic", width: 32 },
        { header: "שעות", key: "hours", width: 10, style: { numFmt: "0.00" } },
        { header: "When", key: "when", width: 14, style: { numFmt: "yyyy-mm-dd" } },
        { header: "Done", key: "done", outlineLevel: 1, hidden: true },
    ];
    sheet.addRow({ topic: "מבוא", hours: 2.75, when: FIXED_DATE, done: true });
    sheet.addRows([
        { topic: "second", hours: 1, when: FIXED_DATE, done: false },
        [ "third", 3.5, FIXED_DATE, true ],
    ]);
    sheet.insertRow(3, [ "inserted", 0.5 ]);

    // Every cell value type.
    sheet.getCell("F1").value = { richText: [ { text: "bold", font: { bold: true } }, { text: " plain" } ] };
    sheet.getCell("F2").value = { text: "link", hyperlink: "https://example.com", tooltip: "tip" };
    sheet.getCell("F3").value = { formula: "B2*2", result: 5.5 };
    sheet.getCell("F4").value = { error: "#N/A" };
    sheet.getCell("F5").value = { formula: "TODAY()", date1904: false };
    sheet.getCell("G1").value = 1;
    sheet.getCell("E1").value = { formula: "G1+1", result: 2 };
    sheet.getCell("E2").value = { sharedFormula: "E1", result: 1 };
    sheet.fillFormula("H1:H3", "G1*2", [ 2, 0, 0 ]);
    sheet.getCell("I1").value = { formula: "SUM(B2:B4)", shareType: "array", ref: "I1:I1", result: 7.75 };

    // Styling: font, fill, alignment, borders, protection.
    const styled = sheet.getCell("A2");
    styled.font = { name: "Arial", bold: true, italic: true, size: 12, color: { argb: "FF0D2336" }, underline: "double" };
    styled.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCDEAF0" } };
    styled.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl", indent: 1 };
    styled.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "double" },
        diagonal: { up: true, style: "dashed" },
    };
    styled.protection = { locked: false, hidden: true };
    sheet.getCell("B2").fill = {
        type: "gradient",
        gradient: "angle",
        degree: 45,
        stops: [ { position: 0, color: { argb: "FF0000FF" } }, { position: 1, color: { argb: "FFFF0000" } } ],
    };

    sheet.getRow(1).height = 22;
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(4).outlineLevel = 1;
    sheet.getRow(4).addPageBreak();

    sheet.mergeCells("A10:C11");
    sheet.getCell("A10").value = "כותרת מאוחדת";
    sheet.mergeCells(12, 1, 12, 3);

    sheet.getCell("A3").note = "plain note";
    sheet.getCell("B3").note = {
        texts: [ { font: { bold: true, size: 9 }, text: "rich " }, { text: "note" } ],
        margins: { insetmode: "custom", inset: [ 0.25, 0.25, 0.35, 0.35 ] },
        protection: { locked: "False", lockText: "False" },
        editAs: "twoCells",
    };

    sheet.getCell("B2").dataValidation = {
        type: "decimal",
        operator: "between",
        allowBlank: true,
        showErrorMessage: true,
        formulae: [ 0, 10 ],
        errorTitle: "Out of range",
        error: "0-10 only",
    };
    sheet.getCell("D2").dataValidation = { type: "list", allowBlank: true, formulae: [ '"yes,no"' ] };

    sheet.addConditionalFormatting({
        ref: "B2:B5",
        rules: [
            {
                type: "cellIs",
                operator: "greaterThan",
                formulae: [ 2 ],
                style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFC7CE" } } },
            },
            { type: "dataBar", minLength: 0, maxLength: 100, cfvo: [ { type: "min" }, { type: "max" } ], color: { argb: "FF638EC6" } },
            { type: "iconSet", iconSet: "3TrafficLights", cfvo: [ { type: "percent", value: 0 }, { type: "percent", value: 33 }, { type: "percent", value: 67 } ] },
            { type: "expression", formulae: [ "MOD(ROW(),2)=0" ], style: { font: { italic: true } } },
        ],
    });

    sheet.autoFilter = "A1:D1";
    sheet.getCell("A2").name = "FirstTopic";
    workbook.definedNames.add("'גיליון'!$B$2:$B$4", "Hours");

    const image = workbook.addImage({ buffer: PNG, extension: "png" });
    const base64Image = workbook.addImage({ base64: `data:image/png;base64,${PNG.toString("base64")}`, extension: "png" });
    sheet.addImage(image, "J2:K4");
    sheet.addImage(base64Image, { tl: { col: 12, row: 2 }, ext: { width: 20, height: 20 }, editAs: "oneCell" });
    sheet.addImage(image, {
        tl: { col: 14, row: 2 },
        ext: { width: 20, height: 20 },
        hyperlinks: { hyperlink: "https://example.com", tooltip: "img" },
    });
    sheet.addBackgroundImage(image);

    const data = workbook.addWorksheet("Data", { state: "hidden" });
    data.addTable({
        name: "Scores",
        ref: "A1",
        headerRow: true,
        totalsRow: true,
        style: { theme: "TableStyleMedium2", showRowStripes: true },
        columns: [
            { name: "Name", totalsRowLabel: "Total", filterButton: true },
            { name: "Score", totalsRowFunction: "sum" },
        ],
        rows: [ [ "a", 1 ], [ "b", 2 ] ],
    });
    workbook.addWorksheet("Scratch");
    workbook.removeWorksheet(workbook.getWorksheet("Scratch").id);

    return workbook;
}

/** Everything a re-read workbook knows, as plain data. */
export function digest(workbook) {
    const { worksheets, media, definedNames, views, calcProperties, creator, lastModifiedBy, created, modified } = workbook.model;
    return {
        properties: { creator, lastModifiedBy, created, modified, title: workbook.title, company: workbook.company },
        calcProperties,
        views,
        definedNames,
        media,
        worksheets,
        tables: workbook.worksheets.map((s) => Object.values(s.tables).map((t) => t.model)),
        // Anchors hold their worksheet, so only their coordinates are kept.
        images: workbook.worksheets.map((s) =>
            s.getImages().map(({ type, imageId, range: { tl, br, ext, editAs, hyperlinks } }) => ({
                type,
                imageId,
                tl: { col: tl.col, row: tl.row },
                br: br && { col: br.col, row: br.row },
                ext,
                editAs,
                hyperlinks,
            })),
        ),
        sheetNames: workbook.worksheets.map((s) => [ s.id, s.name, s.state ]),
    };
}
