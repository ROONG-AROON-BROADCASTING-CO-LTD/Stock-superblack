"use client";
import { useEffect, useState } from "react";
import { Clock3, LogIn, LogOut, CalendarDays, Plus } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import type { Database } from "@/lib/types";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DialogDescription } from "@/components/ui/dialog";
function dateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function date(value: string) {
  return new Date(`${value}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
  });
}
export function AttendancePanel({
  data,
  user,
  mutate,
}: {
  data: Database;
  user: string;
  mutate: (body: unknown) => Promise<void>;
}) {
  const [tab, setTab] = useState("attendance");
  const [now, setNow] = useState<Date | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const entries = data.attendance.filter((a) => a.username === user);
  const leaves = data.leaves.filter((a) => a.username === user);
  const active = entries.find((a) => !a.checkOut);
  async function check(action: string) {
    setBusy(true);
    setError("");
    try {
      await mutate({ action });
      toast.success(
        action === "check-in"
          ? "เช็คอินเรียบร้อยแล้ว ขอให้เป็นวันที่ดี!"
          : "เช็คเอ้าท์เรียบร้อยแล้ว ขอบคุณสำหรับวันนี้",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submitLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const leave = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await mutate({ action: "leave", leave });
      setLeaveOpen(false);
      setTab("leave");
      toast.success("บันทึกการลาเรียบร้อยแล้ว");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">เช็คอิน / เช็คเอ้าท์</h1>
          <p className="text-muted-foreground">
            บันทึกเวลาเข้า–ออกงาน และจัดการวันลาของคุณได้ที่นี่
          </p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setLeaveOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          บันทึกการลา
        </Button>
      </div>
      {error && !leaveOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>เวลาทำงานของคุณ</CardTitle>
            <CardDescription>
              {now
                ? now.toLocaleDateString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "full",
                  })
                : "เวลาประเทศไทย"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "กำลังทำงาน" : "ยังไม่ได้เช็คอิน"}
            </Badge>
            <p className="text-4xl font-semibold tabular-nums sm:text-5xl">
              {now
                ? now.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok" })
                : "— : — : —"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || !!active}
                onClick={() => check("check-in")}
              >
                <LogIn data-icon="inline-start" />
                เช็คอิน
              </Button>
              <Button
                variant="outline"
                disabled={busy || !active}
                onClick={() => check("check-out")}
              >
                <LogOut data-icon="inline-start" />
                เช็คเอ้าท์
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            {active
              ? `เช็คอินล่าสุด ${dateTime(active.checkIn)}`
              : "พร้อมเริ่มวันทำงาน บันทึกเวลาด้วยการเช็คอิน"}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>วันลาของคุณ</CardTitle>
            <CardDescription>
              ดูประวัติและบันทึกการลาได้ในที่เดียว
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{leaves.length} รายการ</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setTab("leave")}>
              <CalendarDays data-icon="inline-start" />
              ดูประวัติการลา
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>ประวัติการทำงาน</CardTitle>
          <CardDescription>เวลาประเทศไทย (GMT+7)</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList>
              <TabsTrigger value="attendance">
                <Clock3 />
                ประวัติลงเวลา
              </TabsTrigger>
              <TabsTrigger value="leave">
                <CalendarDays />
                ประวัติการลา
              </TabsTrigger>
            </TabsList>
            <TabsContent value="attendance">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เช็คอิน</TableHead>
                    <TableHead>เช็คเอ้าท์</TableHead>
                    <TableHead>ระยะเวลาทำงาน</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{dateTime(a.checkIn)}</TableCell>
                      <TableCell>
                        {a.checkOut ? dateTime(a.checkOut) : "—"}
                      </TableCell>
                      <TableCell>
                        {a.checkOut
                          ? `${Math.floor((Date.parse(a.checkOut) - Date.parse(a.checkIn)) / 3600000)} ชม. ${Math.floor((Date.parse(a.checkOut) - Date.parse(a.checkIn)) / 60000) % 60} นาที`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.checkOut ? "secondary" : "default"}>
                          {a.checkOut ? "สิ้นสุดการทำงาน" : "กำลังทำงาน"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!entries.length && (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Clock3 />
                    </EmptyMedia>
                    <EmptyTitle>ยังไม่มีประวัติลงเวลา</EmptyTitle>
                    <EmptyDescription>
                      เริ่มเช็คอิน เพื่อบันทึกเวลาทำงานครั้งแรกของคุณ
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
            <TabsContent value="leave">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ประเภทการลา</TableHead>
                    <TableHead>ตั้งแต่วันที่</TableHead>
                    <TableHead>ถึงวันที่</TableHead>
                    <TableHead>เหตุผล</TableHead>
                    <TableHead>วันที่บันทึก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant="secondary">{l.type}</Badge>
                      </TableCell>
                      <TableCell>{date(l.start)}</TableCell>
                      <TableCell>{date(l.end)}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal wrap-break-word">
                        {l.reason}
                      </TableCell>
                      <TableCell>{dateTime(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!leaves.length && (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarDays />
                    </EmptyMedia>
                    <EmptyTitle>ยังไม่มีประวัติการลา</EmptyTitle>
                    <EmptyDescription>
                      บันทึกลากิจ ลาป่วย ลาพักร้อน หรือการลาอื่นๆ
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError("");
                      setLeaveOpen(true);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    บันทึกการลา
                  </Button>
                </Empty>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          ทั้งหมด {tab === "attendance" ? entries.length : leaves.length} รายการ
        </CardFooter>
      </Card>
      {leaveOpen && (
        <Modal
          title="บันทึกการลา"
          onClose={() => {
            setLeaveOpen(false);
            setError("");
          }}
        >
          <DialogDescription>
            ระบุรายละเอียดวันลา ข้อมูลจะถูกบันทึกในประวัติของคุณ
          </DialogDescription>
          <form onSubmit={submitLeave}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="leave-type">ประเภทการลา *</FieldLabel>
                <NativeSelect id="leave-type" name="type" required>
                  <NativeSelectOption value="">
                    เลือกประเภทการลา
                  </NativeSelectOption>
                  {["ลากิจ", "ลาป่วย", "ลาพักร้อน", "ลาอื่นๆ"].map((t) => (
                    <NativeSelectOption key={t}>{t}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="leave-start">ตั้งแต่วันที่ *</FieldLabel>
                  <Input id="leave-start" type="date" name="start" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="leave-end">ถึงวันที่ *</FieldLabel>
                  <Input id="leave-end" type="date" name="end" required />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="leave-reason">เหตุผลการลา *</FieldLabel>
                <Textarea
                  id="leave-reason"
                  name="reason"
                  required
                  maxLength={2000}
                  rows={4}
                  placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม"
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field orientation="horizontal" className="justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLeaveOpen(false);
                    setError("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "บันทึกการลา"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Modal>
      )}
    </>
  );
}
