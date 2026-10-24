// Legacy `moduleResolution: node10`, which ignores `exports` and falls back
// to package.json's top-level `types`.
import * as excelts from "@system-b90/excelts";
import { Workbook } from "@system-b90/excelts";

export const workbook: excelts.Workbook = new Workbook();
export const type: excelts.ValueType = excelts.ValueType.Null;
