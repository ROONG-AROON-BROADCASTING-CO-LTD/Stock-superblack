import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getSession } from "@/lib/server/auth";

export const metadata = { title: "ผู้ดูแลระบบ | SUPERBLACK" };

async function ProtectedAdmin() {
  await connection();
  const user = await getSession();
  if (user?.role !== "admin") redirect("/admin/login");
  return <AdminWorkspace user={user} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6" role="status">กำลังตรวจสอบสิทธิ์…</p>}>
      <ProtectedAdmin />
    </Suspense>
  );
}
