// Bundler consumer (Next.js, Vite): `moduleResolution: bundler`. The import
// below is a typical export route's: the class plus the types it styles with.
import {
    Workbook,
    type Border,
    type Borders,
    type Cell,
    type CellValue,
    type Row,
    type Worksheet,
} from "@system-b90/excelts";
import excelts from "@system-b90/excelts";

// `Workbook` reads as both the class and the instance type, as it did there.
export async function build(): Promise<Workbook> {
    const workbook = new Workbook();
    const sheet: Worksheet = workbook.addWorksheet("גיליון");
    const row: Row = sheet.addRow([ "מבוא" ]);
    const cell: Cell = row.getCell(1);
    const value: CellValue = cell.value;
    const edge: Partial<Border> = { style: "thin", color: { argb: "FFD9D9D9" } };
    const borders: Partial<Borders> = { top: edge, bottom: edge };
    cell.border = borders;
    cell.value = value;
    await workbook.xlsx.writeBuffer();
    return workbook;
}

export const isClass: boolean = new excelts.Workbook() instanceof Workbook;
