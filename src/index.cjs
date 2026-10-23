/*
 * The package's public API.
 *
 * CommonJS on purpose: the library reaches Node builtins through `require`,
 * and bundling CommonJS to ESM makes esbuild emit a `require` shim that
 * Next.js's page-data collection rejects ("dynamic usage of require is not
 * supported"). dist/index.mjs is generated over this instead -- see
 * scripts/build.mjs.
 */

"use strict";

module.exports = {
    Workbook: require("./lib/doc/workbook"),
    ModelContainer: require("./lib/doc/modelcontainer"),
    stream: {
        xlsx: {
            WorkbookWriter: require("./lib/stream/xlsx/workbook-writer"),
            WorkbookReader: require("./lib/stream/xlsx/workbook-reader"),
        },
    },
    ...require("./lib/doc/enums"),
};
