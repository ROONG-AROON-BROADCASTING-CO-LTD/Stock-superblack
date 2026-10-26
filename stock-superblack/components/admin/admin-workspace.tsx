"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import type { SessionUser } from "@/lib/types";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AdminWorkspace({ user }: { user: SessionUser }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", {}, "DELETE");
      window.location.replace("/admin/login");
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-5" />
              <span className="font-semibold">SUPERBLACK · Admin</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
                <ArrowLeft data-icon="inline-start" />
                พื้นที่ทำงาน
              </Button>
              <Button variant="outline" onClick={logout} disabled={busy}>
                <LogOut data-icon="inline-start" />
                {busy ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AdminPanel />
        </main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
