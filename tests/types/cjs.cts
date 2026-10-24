// CommonJS consumer under `module: nodenext`: resolves the `require`
// condition, dist/index.d.cts.
import excelts = require("@system-b90/excelts");
import { Workbook, type Worksheet } from "@system-b90/excelts";

const workbook: excelts.Workbook = new excelts.Workbook();
const sheet: Worksheet = new Workbook().addWorksheet("s");
const reader: excelts.stream.xlsx.WorkbookReader = new excelts.stream.xlsx.WorkbookReader("in.xlsx", {});
const kind: excelts.ValueType = excelts.ValueType.Merge;

// @ts-expect-error -- not part of excelts's API; proves types are not `any`.
workbook.notAMethod();

export = { kind, reader, sheet };
