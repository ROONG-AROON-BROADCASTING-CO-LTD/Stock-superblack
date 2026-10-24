import { getSession, login, logout } from "@/lib/server/auth";
export async function GET() {
  return Response.json((await getSession()) ?? { username: null, role: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  )
    return Response.json(
      { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" },
      { status: 400 },
    );
  const user = await login(body.username, body.password);
  if (!user)
    return Response.json(
      { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 },
    );
  return Response.json(user);
}
export async function DELETE() {
  await logout();
  return Response.json({ success: true });
}
