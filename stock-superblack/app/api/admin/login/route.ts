import { login } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    return Response.json(
      { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" },
      { status: 400 },
    );
  }
  const user = await login(body.username, body.password, "admin");
  if (!user) {
    return Response.json(
      { error: "ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง" },
      { status: 401 },
    );
  }
  return Response.json(user, { headers: { "Cache-Control": "no-store" } });
}
