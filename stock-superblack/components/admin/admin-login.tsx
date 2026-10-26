"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      await api("/api/admin/login", Object.fromEntries(values));
      // A fresh navigation discards any cached UI from the previous account.
      window.location.replace("/admin");
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <ShieldCheck aria-hidden="true" />
          <CardTitle><h1>เข้าสู่ระบบผู้ดูแล</h1></CardTitle>
          <CardDescription>
            SUPERBLACK Admin · สำหรับผู้ดูแลระบบเท่านั้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={login} aria-busy={busy}>
            <FieldGroup>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="admin-username">อีเมล / ชื่อผู้ใช้แอดมิน</FieldLabel>
                <Input
                  id="admin-username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                  maxLength={120}
                  placeholder="กรอกบัญชีผู้ดูแลระบบ"
                  aria-invalid={!!error}
                  aria-describedby={error ? "admin-login-error" : undefined}
                />
              </Field>
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor="admin-password">รหัสผ่าน</FieldLabel>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  placeholder="กรอกรหัสผ่าน"
                  aria-invalid={!!error}
                  aria-describedby={error ? "admin-login-error" : undefined}
                />
              </Field>
              {error && (
                <Alert variant="destructive" id="admin-login-error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบแอดมิน"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" />
            กลับพื้นที่ทำงาน
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
