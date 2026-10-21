import { getUser } from "@/lib/server/auth";
import { readDatabase } from "@/lib/server/database";
import ExcelJS from "exceljs";
export async function POST(request: Request) {
  if (!(await getUser()))
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120)
    return Response.json(
      { error: "กรุณาระบุชื่อผู้ส่งออก (ไม่เกิน 120 ตัวอักษร)" },
      { status: 400 },
    );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = name;
  const sheet = workbook.addWorksheet("สต๊อกสินค้า");
  sheet.addRow(["รายงานสต๊อกสินค้า — SUPERBLACK"]);
  sheet.addRow(["ผู้ส่งออก", name]);
  sheet.addRow([
    "วันที่ส่งออก",
    new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
  ]);
  sheet.addRow([]);
  sheet.addRow([
    "รหัสสินค้า",
    "ชื่อสินค้า",
    "หมวดหมู่",
    "จำนวน",
    "หน่วย",
    "จำนวนขั้นต่ำ",
    "สถานะ",
  ]);
  for (const p of (await readDatabase()).products)
    sheet.addRow([
      p.sku,
      p.name,
      p.category,
      p.quantity,
      p.unit,
      p.minimum,
      p.quantity <= p.minimum ? "สต๊อกต่ำ" : "พร้อมใช้งาน",
    ]);
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(5).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF202321" },
  };
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="superblack-inventory.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
