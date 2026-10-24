import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionUser } from "@/lib/types";
import { readDatabase } from "@/lib/server/database";
import { verifyPassword } from "@/lib/server/password";

const cookieName = "superblack-session";
function sign(value: string) {
  return createHmac("sha256", process.env.AUTH_PASSWORD!)
    .update(value)
    .digest("hex");
}
function admin(): SessionUser {
  return {
    id: "admin",
    username: process.env.AUTH_USERNAME!,
    name: "ผู้ดูแลระบบ",
    role: "admin",
  };
}
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD)
    return null;
  const parts = token.split(".");
  // Keep existing administrator sessions working until their original expiry.
  const legacy = parts.length === 2;
  if (!legacy && parts.length !== 3) return null;
  const [expires, subject, signature] = legacy
    ? [parts[0], "admin", parts[1]]
    : parts;
  if (
    !/^\d+$/.test(expires) ||
    !Number.isSafeInteger(Number(expires)) ||
    Number(expires) <= Date.now()
  )
    return null;
  const expected = sign(legacy ? expires : `${expires}.${subject}`);
  if (
    !/^[a-f0-9]{64}$/.test(signature) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  if (subject === "admin") return admin();
  const employee = (await readDatabase()).employees.find(
    (item) => item.id === subject && item.active,
  );
  return employee
    ? {
        id: employee.id,
        username: employee.username,
        name: employee.name,
        role: "employee",
      }
    : null;
}
export async function getUser() {
  return (await getSession())?.username ?? null;
}
export async function login(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  if (
    !process.env.AUTH_USERNAME ||
    !process.env.AUTH_PASSWORD ||
    username.length > 120 ||
    password.length > 256
  )
    return null;
  let user: SessionUser;
  if (
    username.trim().toLowerCase() === process.env.AUTH_USERNAME.toLowerCase()
  ) {
    if (password !== process.env.AUTH_PASSWORD) return null;
    user = admin();
  } else {
    const employee = (await readDatabase()).employees.find(
      (item) =>
        item.username.toLowerCase() === username.trim().toLowerCase() &&
        item.active,
    );
    if (!employee || !(await verifyPassword(password, employee.passwordHash)))
      return null;
    user = {
      id: employee.id,
      username: employee.username,
      name: employee.name,
      role: "employee",
    };
  }
  const value = `${Date.now() + 1000 * 60 * 60 * 12}.${user.id}`;
  (await cookies()).set(cookieName, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43200,
  });
  return user;
}
export async function logout() {
  (await cookies()).delete(cookieName);
}
