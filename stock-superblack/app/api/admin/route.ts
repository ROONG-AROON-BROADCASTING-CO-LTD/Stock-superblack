import { getSession } from "@/lib/server/auth";
import { readDatabase, updateDatabase } from "@/lib/server/database";
import { hashPassword } from "@/lib/server/password";
import { adminView } from "@/lib/server/views";

export async function GET() {
  const user = await getSession();
  if (!user)
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (user.role !== "admin")
    return Response.json(
      { error: "เฉพาะผู้ดูแลระบบเท่านั้น" },
      { status: 403 },
    );
  return Response.json(adminView(await readDatabase()), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user)
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (user.role !== "admin")
    return Response.json(
      { error: "เฉพาะผู้ดูแลระบบเท่านั้น" },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  if (!body)
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  try {
    if (body.action === "create-employee") {
      const employee = body.employee;
      if (
        !employee ||
        typeof employee.name !== "string" ||
        !employee.name.trim() ||
        employee.name.length > 120 ||
        typeof employee.username !== "string" ||
        employee.username.length > 120 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.username.trim()) ||
        typeof employee.department !== "string" ||
        employee.department.length > 120 ||
        typeof employee.password !== "string" ||
        employee.password.length < 8 ||
        employee.password.length > 256
      ) {
        throw Error(
          "กรุณากรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษรให้ถูกต้อง",
        );
      }
      const username = employee.username.trim().toLowerCase();
      const passwordHash = await hashPassword(employee.password);
      await updateDatabase((data) => {
        if (
          username === process.env.AUTH_USERNAME?.toLowerCase() ||
          data.employees.some(
            (item) => item.username.toLowerCase() === username,
          )
        )
          throw Error("อีเมลนี้มีบัญชีอยู่แล้ว");
        data.employees.unshift({
          id: crypto.randomUUID(),
          name: employee.name.trim(),
          username,
          department: employee.department.trim(),
          passwordHash,
          active: true,
          createdAt: new Date().toISOString(),
        });
      });
    } else if (body.action === "set-employee-active") {
      if (typeof body.id !== "string" || typeof body.active !== "boolean")
        throw Error("ข้อมูลไม่ถูกต้อง");
      await updateDatabase((data) => {
        const employee = data.employees.find((item) => item.id === body.id);
        if (!employee) throw Error("ไม่พบพนักงาน");
        employee.active = body.active;
      });
    } else if (body.action === "review-leave") {
      if (
        typeof body.id !== "string" ||
        !["approved", "rejected"].includes(body.status) ||
        typeof body.note !== "string" ||
        body.note.length > 2000 ||
        (body.status === "rejected" && !body.note.trim())
      )
        throw Error("กรุณาระบุผลการพิจารณาและเหตุผลเมื่อไม่อนุมัติ");
      await updateDatabase((data) => {
        const leave = data.leaves.find((item) => item.id === body.id);
        if (!leave) throw Error("ไม่พบใบลา");
        if (leave.status !== "pending")
          throw Error("ใบลานี้ได้รับการพิจารณาแล้ว กรุณารีเฟรชข้อมูล");
        leave.status = body.status;
        leave.reviewNote = body.note.trim();
        leave.reviewedAt = new Date().toISOString();
        leave.reviewedBy = user.username;
      });
    } else throw Error("คำสั่งไม่ถูกต้อง");
    return Response.json(adminView(await readDatabase()));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
