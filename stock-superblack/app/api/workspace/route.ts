import { getUser } from "@/lib/server/auth";
import { readDatabase, updateDatabase } from "@/lib/server/database";
export async function GET() {
  if (!(await getUser()))
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  return Response.json(await readDatabase(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const username = await getUser();
  if (!username)
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body)
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  try {
    await updateDatabase((data) => {
      const now = new Date().toISOString();
      if (body.action === "save-product") {
        const p = body.product;
        if (
          !p ||
          ![p.sku, p.name, p.unit].every(
            (v) => typeof v === "string" && v.trim() && v.length <= 160,
          ) ||
          typeof p.category !== "string" ||
          !Number.isSafeInteger(p.quantity) ||
          p.quantity < 0 ||
          !Number.isSafeInteger(p.minimum) ||
          p.minimum < 0
        )
          throw Error("กรุณาระบุข้อมูลสินค้าและจำนวนเต็มที่ไม่ติดลบ");
        if (
          data.products.some(
            (item) =>
              item.sku.toLowerCase() === p.sku.trim().toLowerCase() &&
              item.id !== p.id,
          )
        )
          throw Error("รหัสสินค้านี้มีอยู่แล้ว");
        const index = data.products.findIndex((item) => item.id === p.id);
        if (p.id && index < 0) throw Error("ไม่พบสินค้า");
        const product = {
          id: p.id || crypto.randomUUID(),
          sku: p.sku.trim(),
          name: p.name.trim(),
          category: p.category.trim().slice(0, 160),
          unit: p.unit.trim(),
          quantity: p.quantity,
          minimum: p.minimum,
          updatedAt: now,
        };
        if (index >= 0) data.products[index] = product;
        else data.products.push(product);
      } else if (body.action === "check-in") {
        if (
          data.attendance.some(
            (item) => item.username === username && !item.checkOut,
          )
        )
          throw Error("คุณเช็คอินแล้ว กรุณาเช็คเอ้าท์ก่อน");
        data.attendance.unshift({
          id: crypto.randomUUID(),
          username,
          checkIn: now,
          checkOut: null,
        });
      } else if (body.action === "check-out") {
        const entry = data.attendance.find(
          (item) => item.username === username && !item.checkOut,
        );
        if (!entry) throw Error("กรุณาเช็คอินก่อน");
        entry.checkOut = now;
      } else if (body.action === "leave") {
        const leave = body.leave;
        if (
          !leave ||
          !["ลากิจ", "ลาป่วย", "ลาพักร้อน", "ลาอื่นๆ"].includes(leave.type) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(leave.start) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(leave.end) ||
          !Number.isFinite(Date.parse(leave.start)) ||
          !Number.isFinite(Date.parse(leave.end)) ||
          leave.start > leave.end ||
          typeof leave.reason !== "string" ||
          !leave.reason.trim() ||
          leave.reason.length > 2000
        )
          throw Error("กรุณาระบุประเภท วันลา และเหตุผลให้ถูกต้อง");
        data.leaves.unshift({
          id: crypto.randomUUID(),
          username,
          type: leave.type,
          start: leave.start,
          end: leave.end,
          reason: leave.reason.trim(),
          createdAt: now,
        });
      } else throw Error("คำสั่งไม่ถูกต้อง");
    });
    return Response.json(await readDatabase());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
