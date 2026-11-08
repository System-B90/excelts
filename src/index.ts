/*
 * The package's public API.
 *
 * scripts/build.mjs bundles this module and re-exports it as CommonJS
 * (`module.exports = { Workbook, ... }`): the library reaches Node builtins
 * through `require`, and an ESM bundle would make esbuild emit a `require` shim
 * that Next.js's page-data collection rejects ("dynamic usage of require is not
 * supported"). dist/index.mjs is generated over the CommonJS bundle instead.
 */

import ModelContainer from "./doc/modelcontainer";
import Workbook from "./doc/workbook";
import WorkbookReader from "./stream/xlsx/workbook-reader";
import WorkbookWriter from "./stream/xlsx/workbook-writer";

export { ModelContainer, Workbook };

export const stream = {
  xlsx: { WorkbookWriter, WorkbookReader },
};

export { DocumentType, ErrorValue, FormulaType, ReadingOrder, RelationshipType, ValueType } from "./doc/enums";
