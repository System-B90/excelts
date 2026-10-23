// ESM consumer under `module: nodenext`: resolves the `import` condition,
// dist/index.d.mts -- default and named exports.
import excelts, {
    stream,
    ValueType,
    Workbook,
    type Alignment,
    type Border,
    type Borders,
    type Cell,
    type CellValue,
    type Column,
    type Fill,
    type Font,
    type Row,
    type Worksheet,
} from "@system-b90/excelts";

const workbook: Workbook = new Workbook();
const sheet: Worksheet = workbook.addWorksheet("s");
const row: Row = sheet.addRow([ 1, "two" ]);
const cell: Cell = row.getCell(1);
const value: CellValue = cell.value;
const isFormula: boolean = cell.type === ValueType.Formula;
const font: Partial<Font> = { bold: true };
const fill: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCDEAF0" } };
const alignment: Partial<Alignment> = { horizontal: "center" };
const border: Partial<Border> = { style: "thin" };
const borders: Partial<Borders> = { top: border };
const column: Partial<Column> = { width: 10 };

const sameClass: typeof Workbook = excelts.Workbook;
const writer = new stream.xlsx.WorkbookWriter({ filename: "out.xlsx", useStyles: true });
const reader = new excelts.stream.xlsx.WorkbookReader("in.xlsx", { sharedStrings: "cache" });
const buffer: Promise<excelts.Buffer> = workbook.xlsx.writeBuffer();

// @ts-expect-error -- not part of excelts's API; proves types are not `any`.
workbook.notAMethod();

export { alignment, borders, buffer, column, fill, font, isFormula, reader, sameClass, value, writer };
