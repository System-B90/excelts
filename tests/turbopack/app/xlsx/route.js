// Default import: the whole API as one namespace.
import excelts from "@system-b90/excelts";

export const dynamic = "force-dynamic";

export async function GET() {
    const workbook = new excelts.Workbook();
    workbook.addWorksheet("Sheet").addRow([ "hello", 42 ]);
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
        headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
}
