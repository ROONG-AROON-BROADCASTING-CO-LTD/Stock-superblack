import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "superblack-session";
function sign(value: string) {
  return createHmac("sha256", process.env.AUTH_PASSWORD || "unconfigured")
    .update(value)
    .digest("hex");
}
export async function getUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD)
    return null;
  const [expires, signature] = token.split(".");
  const expected = sign(expires || "");
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ||
    Number(expires) < Date.now()
  )
    return null;
  return process.env.AUTH_USERNAME;
}
export async function login(username: string, password: string) {
  if (
    !process.env.AUTH_USERNAME ||
    !process.env.AUTH_PASSWORD ||
    username !== process.env.AUTH_USERNAME ||
    password !== process.env.AUTH_PASSWORD
  )
    return false;
  const expires = String(Date.now() + 1000 * 60 * 60 * 12);
  (await cookies()).set(cookieName, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43200,
  });
  return true;
}
export async function logout() {
  (await cookies()).delete(cookieName);
}
