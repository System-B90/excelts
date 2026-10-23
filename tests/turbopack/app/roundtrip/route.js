// Named imports, and the streaming reader's temp-file path (src/shims/tmp.cjs)
// running inside a Turbopack server bundle rather than plain Node.
import { Readable } from "node:stream";

import { Workbook, stream } from "@system-b90/excelts";

export const dynamic = "force-dynamic";

export async function GET() {
    const workbook = new Workbook();
    workbook.addWorksheet("Sheet").addRows([ [ "shared", "strings" ], [ "שלום", 7 ] ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = [];
    const reader = new stream.xlsx.WorkbookReader(Readable.from([ buffer ]), { sharedStrings: "cache" });
    for await (const sheet of reader) {
        for await (const row of sheet) rows.push(row.values.slice(1));
    }
    return Response.json(rows);
}
