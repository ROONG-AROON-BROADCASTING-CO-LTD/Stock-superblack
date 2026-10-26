"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Clock3, LogOut } from "lucide-react";
import { Inventory } from "@/components/inventory/inventory";
import { AttendancePanel } from "@/components/attendance/attendance-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SessionUser, WorkspaceData } from "@/lib/types";
import { api } from "@/lib/api-client";

type Page = "inventory" | "attendance";

function WorkspaceNavigation({
  page,
  logout,
}: {
  page: Page;
  logout: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <Box />
              <span>SUPERBLACK</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>พื้นที่ทำงาน</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={page === "inventory"}
                  tooltip="สต๊อกสินค้า"
                  render={<Link href="/" />}
                  onClick={() => setOpenMobile(false)}
                >
                  <Box />
                  <span>สต๊อกสินค้า</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={page === "attendance"}
                  tooltip="เช็คอิน / เช็คเอ้าท์"
                  render={<Link href="/attendance" />}
                  onClick={() => setOpenMobile(false)}
                >
                  <Clock3 />
                  <span>เช็คอิน / เช็คเอ้าท์</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="ออกจากระบบ">
              <LogOut />
              <span>ออกจากระบบ</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Workspace({ page }: { page: Page }) {
  const [user, setUser] = useState<string | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api("/api/auth")
      .then(async (auth) => {
        if (!active) return;
        setUser(auth.username);
        setSession(auth.username ? auth : null);
        if (auth.username) {
          const db = await api("/api/workspace");
          if (active) setData(db);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function mutate(body: unknown) {
    setData(await api("/api/workspace", body));
  }
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const auth = await api("/api/auth", Object.fromEntries(values));
      setData(await api("/api/workspace"));
      setUser(auth.username);
      setSession(auth);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/auth", {}, "DELETE");
      setUser(null);
      setSession(null);
      setData(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (loading)
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-4" role="status">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <span className="sr-only">กำลังโหลดพื้นที่ทำงาน</span>
        </div>
      </main>
    );
  if (!user)
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Box />
            <CardTitle>เข้าสู่ระบบ SUPERBLACK</CardTitle>
            <CardDescription>
              จัดการสต๊อกสินค้าและเวลาทำงานในพื้นที่เดียวกัน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={login}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">อีเมล / ชื่อผู้ใช้</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    maxLength={120}
                    placeholder="กรอกอีเมลหรือชื่อผู้ใช้"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="กรอกรหัสผ่าน"
                  />
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  const title = page === "inventory" ? "สต๊อกสินค้า" : "เช็คอิน / เช็คเอ้าท์";
  return (
    <TooltipProvider>
      <SidebarProvider>
        <WorkspaceNavigation page={page} logout={logout} />
        <SidebarInset className="min-w-0">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger aria-label="เปิดหรือปิดเมนู" />
              <span className="truncate">{title}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Avatar>
                <AvatarFallback>{user.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="max-w-40 truncate sm:max-w-none">
                {session?.name || user}
              </span>
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {data ? (
              page === "inventory" ? (
                <Inventory products={data.products} mutate={mutate} />
              ) : (
                <AttendancePanel data={data} user={user} mutate={mutate} />
              )
            ) : (
              <Alert>
                <AlertDescription>
                  โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ
                </AlertDescription>
              </Alert>
            )}
          </div>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}
