import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminLogin } from "@/components/admin/admin-login";
import { getSession } from "@/lib/server/auth";

export const metadata = { title: "เข้าสู่ระบบผู้ดูแล | SUPERBLACK" };

async function LoginPage() {
  await connection();
  if ((await getSession())?.role === "admin") redirect("/admin");
  return <AdminLogin />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6" role="status">กำลังโหลดหน้าเข้าสู่ระบบ…</p>}>
      <LoginPage />
    </Suspense>
  );
}
