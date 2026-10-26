import { getSession } from "@/lib/server/auth";
import { readDatabase, updateDatabase } from "@/lib/server/database";
import { generateSchedule } from "@/lib/server/schedule";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  return Response.json({ schedules: (await readDatabase()).schedules }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const schedule = await updateDatabase((data) => {
      const result = generateSchedule(data, body, user.username);
      data.schedules.unshift(result);
      return result;
    });
    return Response.json({ schedule }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "สร้างตารางไม่สำเร็จ" }, { status: 400 });
  }
}
