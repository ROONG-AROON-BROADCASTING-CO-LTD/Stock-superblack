"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardCheck,
  PackagePlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminData, Employee, Leave } from "@/lib/types";
import { api } from "@/lib/api-client";
import { date, dateTime, leaveStatus } from "@/lib/format";
import { Modal } from "@/components/dashboard/modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const SchedulePanel = dynamic(() => import("./schedule-panel").then((module) => module.SchedulePanel), {
  loading: () => <p role="status">กำลังโหลดระบบสุ่มตาราง…</p>,
});

function NoResults({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState("pending");
  const [stockFilter, setStockFilter] = useState("all");
  const [stockQuery, setStockQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [review, setReview] = useState<{
    leave: Leave;
    status: "approved" | "rejected";
  } | null>(null);
  const [employeeAction, setEmployeeAction] = useState<Employee | null>(null);

  useEffect(() => {
    let active = true;
    api("/api/admin")
      .then((result) => {
        if (active) setData(result);
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

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await api("/api/admin"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function close() {
    if (busy) return;
    setReview(null);
    setCreateOpen(false);
    setEmployeeAction(null);
    setFormError("");
  }
  async function save(body: unknown, message: string) {
    setBusy(true);
    setFormError("");
    try {
      setData(await api("/api/admin", body));
      setReview(null);
      setCreateOpen(false);
      setEmployeeAction(null);
      setError("");
      toast.success(message);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const employees = data?.employees ?? [];
  const pending =
    data?.leaves.filter((item) => item.status === "pending").length ?? 0;
  const leaves =
    data?.leaves.filter(
      (item) => leaveFilter === "all" || item.status === leaveFilter,
    ) ?? [];
  const movements =
    data?.stockMovements.filter(
      (item) =>
        `${item.sku} ${item.name} ${item.username}`
          .toLowerCase()
          .includes(stockQuery.toLowerCase()) &&
        (stockFilter === "all" ||
          (stockFilter === "in"
            ? item.change > 0
            : stockFilter === "out"
              ? item.change < 0
              : item.change === 0)),
    ) ?? [];
  const visibleEmployees = employees.filter((item) =>
    `${item.name} ${item.username} ${item.department}`
      .toLowerCase()
      .includes(employeeQuery.toLowerCase()),
  );
  const names = new Map(employees.map((item) => [item.username, item.name]));

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6" />
            <h1 className="text-2xl font-semibold">ภาพรวมผู้ดูแลระบบ</h1>
          </div>
          <p className="text-muted-foreground">
            จัดการใบลา ติดตามสต๊อก และดูแลทีมของคุณ
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading || busy}>
          <RefreshCw data-icon="inline-start" />
          {loading ? "กำลังโหลด…" : "รีเฟรชข้อมูล"}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!data && loading ? (
        <div
          className="grid gap-4 sm:grid-cols-3"
          role="status"
          aria-label="กำลังโหลดข้อมูลแอดมิน"
        >
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>พนักงานที่เปิดใช้งาน</CardDescription>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {employees.filter((item) => item.active).length} คน
                  </span>
                  <Users />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ทั้งหมด {employees.length} คน · ปิดใช้งาน{" "}
                  {employees.filter((item) => !item.active).length} คน ·
                  ไม่รวมแอดมิน
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>ใบลารออนุมัติ</CardDescription>
                <CardTitle className="flex items-center justify-between">
                  <span>{pending} รายการ</span>
                  <ClipboardCheck />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  จากใบลาทั้งหมด {data.leaves.length} รายการ
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>รายการเพิ่มสต๊อก</CardDescription>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {
                      data.stockMovements.filter((item) => item.change > 0)
                        .length
                    }{" "}
                    ครั้ง
                  </span>
                  <PackagePlus />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  นับจากประวัติที่บันทึกตั้งแต่เริ่มใช้ระบบติดตาม
                </p>
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue="leaves" className="min-w-0">
            <TabsList className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-auto sm:inline-flex sm:w-fit [&_[data-slot=tabs-trigger]]:h-8">
              <TabsTrigger value="leaves">
                <ClipboardCheck />
                อนุมัติการลา ({pending})
              </TabsTrigger>
              <TabsTrigger value="stock">
                <PackagePlus />
                ประวัติสต๊อก
              </TabsTrigger>
              <TabsTrigger value="employees">
                <Users />
                พนักงาน ({employees.length})
              </TabsTrigger>
              <TabsTrigger value="schedules">
                <CalendarDays />
                สุ่มตารางงาน
              </TabsTrigger>
            </TabsList>
            <TabsContent value="schedules">
              <SchedulePanel employees={employees} />
            </TabsContent>
            <TabsContent value="leaves">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>คำขอลาของทีม</CardTitle>
                  <CardDescription>
                    ตรวจสอบรายละเอียดก่อนอนุมัติหรือระบุเหตุผลที่ไม่อนุมัติ
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-4">
                  <NativeSelect
                    aria-label="กรองสถานะใบลา"
                    value={leaveFilter}
                    onChange={(e) => setLeaveFilter(e.target.value)}
                  >
                    <NativeSelectOption value="all">
                      ทุกสถานะ
                    </NativeSelectOption>
                    {Object.entries(leaveStatus).map(([value, label]) => (
                      <NativeSelectOption key={value} value={value}>
                        {label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>พนักงาน</TableHead>
                        <TableHead>ประเภท / ช่วงวันที่</TableHead>
                        <TableHead>เหตุผล</TableHead>
                        <TableHead>สถานะ / ผลพิจารณา</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell>
                            <div>
                              {names.get(leave.username) || leave.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ส่ง {dateTime(leave.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{leave.type}</div>
                            <div className="text-xs text-muted-foreground">
                              {date(leave.start)} – {date(leave.end)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-64 whitespace-normal wrap-break-word">
                            {leave.reason}
                          </TableCell>
                          <TableCell className="max-w-64 whitespace-normal wrap-break-word">
                            <Badge
                              variant={
                                leave.status === "rejected"
                                  ? "destructive"
                                  : leave.status === "approved"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {leaveStatus[leave.status]}
                            </Badge>
                            {leave.reviewedAt && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {leave.reviewedBy} ·{" "}
                                {dateTime(leave.reviewedAt)}
                              </p>
                            )}
                            {leave.reviewNote && (
                              <p className="mt-1 text-sm">{leave.reviewNote}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {leave.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => {
                                    setFormError("");
                                    setReview({ leave, status: "approved" });
                                  }}
                                >
                                  อนุมัติ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => {
                                    setFormError("");
                                    setReview({ leave, status: "rejected" });
                                  }}
                                >
                                  ไม่อนุมัติ
                                </Button>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!leaves.length && (
                    <NoResults
                      title={
                        leaveFilter === "pending"
                          ? "ไม่มีใบลารออนุมัติ"
                          : "ไม่พบใบลา"
                      }
                      description="เมื่อพนักงานส่งคำขอลา รายการจะปรากฏที่นี่"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stock">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>ประวัติการเปลี่ยนสต๊อก</CardTitle>
                  <CardDescription>
                    สินค้า จำนวนก่อน–หลัง ผู้บันทึก และเวลา ·
                    ไม่มีประวัติย้อนหลังสำหรับรายการก่อนเปิดใช้ฟีเจอร์นี้
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      aria-label="ค้นหาประวัติสต๊อก"
                      placeholder="ค้นหาชื่อสินค้า รหัส หรือผู้บันทึก"
                      value={stockQuery}
                      onChange={(e) => setStockQuery(e.target.value)}
                    />
                    <NativeSelect
                      aria-label="กรองการเปลี่ยนสต๊อก"
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                    >
                      <NativeSelectOption value="all">
                        ทุกรายการ
                      </NativeSelectOption>
                      <NativeSelectOption value="in">
                        เพิ่มสต๊อก
                      </NativeSelectOption>
                      <NativeSelectOption value="out">
                        ลดสต๊อก
                      </NativeSelectOption>
                      <NativeSelectOption value="edit">
                        จำนวนไม่เปลี่ยน
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันเวลา</TableHead>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>รายการ</TableHead>
                        <TableHead className="text-right">ก่อน</TableHead>
                        <TableHead className="text-right">
                          เปลี่ยนแปลง
                        </TableHead>
                        <TableHead className="text-right">หลัง</TableHead>
                        <TableHead>หน่วย</TableHead>
                        <TableHead>ผู้บันทึก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{dateTime(item.createdAt)}</TableCell>
                          <TableCell>
                            <div>{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.sku}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.kind === "created"
                                ? "สินค้าใหม่"
                                : item.kind === "updated"
                                  ? "แก้ไขรายละเอียด"
                                  : item.change > 0
                                    ? "เพิ่มสต๊อก"
                                    : "ลดสต๊อก"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.before.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.change > 0 ? "+" : ""}
                            {item.change.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.after.toLocaleString()}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            {names.get(item.username) || item.username}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!movements.length && (
                    <NoResults
                      title="ไม่พบประวัติสต๊อก"
                      description="การเพิ่มสินค้าและแก้ไขจำนวนในหน้าสต๊อกจะถูกบันทึกที่นี่โดยอัตโนมัติ"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="employees">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>ทะเบียนพนักงาน</CardTitle>
                  <CardDescription>
                    พนักงานแต่ละคนใช้บัญชีของตนเองเพื่อลงเวลาและส่งคำขอลา
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      aria-label="ค้นหาพนักงาน"
                      placeholder="ค้นหาชื่อ อีเมล หรือแผนก"
                      value={employeeQuery}
                      onChange={(e) => setEmployeeQuery(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        setFormError("");
                        setCreateOpen(true);
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      เพิ่มพนักงาน
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อพนักงาน</TableHead>
                        <TableHead>อีเมลเข้าสู่ระบบ</TableHead>
                        <TableHead>แผนก</TableHead>
                        <TableHead>วันที่เพิ่ม</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>{employee.name}</TableCell>
                          <TableCell>{employee.username}</TableCell>
                          <TableCell>{employee.department || "—"}</TableCell>
                          <TableCell>{dateTime(employee.createdAt)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                employee.active ? "secondary" : "outline"
                              }
                            >
                              {employee.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFormError("");
                                setEmployeeAction(employee);
                              }}
                            >
                              {employee.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!visibleEmployees.length && (
                    <NoResults
                      title={
                        employees.length
                          ? "ไม่พบพนักงานที่ค้นหา"
                          : "ยังไม่มีพนักงานในทะเบียน"
                      }
                      description="เพิ่มชื่อและบัญชีพนักงานเพื่อเริ่มใช้งาน จำนวนนี้ไม่รวมบัญชีผู้ดูแลระบบ"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
      {createOpen && (
        <Modal title="เพิ่มพนักงาน" onClose={close}>
          <DialogDescription>
            สร้างบัญชีเพื่อให้พนักงานเข้าสู่ระบบด้วยอีเมลและรหัสผ่านนี้
          </DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save(
                {
                  action: "create-employee",
                  employee: Object.fromEntries(
                    new FormData(event.currentTarget),
                  ),
                },
                "เพิ่มพนักงานเรียบร้อยแล้ว",
              );
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="employee-name">ชื่อ–นามสกุล *</FieldLabel>
                <Input
                  id="employee-name"
                  name="name"
                  required
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-email">อีเมล *</FieldLabel>
                <Input
                  id="employee-email"
                  name="username"
                  type="email"
                  required
                  maxLength={120}
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-department">แผนก</FieldLabel>
                <Input
                  id="employee-department"
                  name="department"
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="employee-password">
                  รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) *
                </FieldLabel>
                <Input
                  id="employee-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                />
              </Field>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <Field orientation="horizontal" className="justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={close}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "สร้างบัญชีพนักงาน"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Modal>
      )}
      {review && (
        <Modal
          title={
            review.status === "approved"
              ? "ยืนยันอนุมัติการลา"
              : "ไม่อนุมัติการลา"
          }
          onClose={close}
        >
          <DialogDescription>
            {names.get(review.leave.username) || review.leave.username} ·{" "}
            {review.leave.type} · {date(review.leave.start)} –{" "}
            {date(review.leave.end)}
          </DialogDescription>
          <p className="whitespace-pre-wrap wrap-break-word">
            {review.leave.reason}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const note = new FormData(event.currentTarget).get("note");
              void save(
                {
                  action: "review-leave",
                  id: review.leave.id,
                  status: review.status,
                  note,
                },
                "บันทึกผลการพิจารณาแล้ว",
              );
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="review-note">
                  {review.status === "rejected"
                    ? "เหตุผลที่ไม่อนุมัติ *"
                    : "หมายเหตุ (ถ้ามี)"}
                </FieldLabel>
                <Textarea
                  id="review-note"
                  name="note"
                  required={review.status === "rejected"}
                  maxLength={2000}
                />
              </Field>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <Field orientation="horizontal" className="justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={busy}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  variant={
                    review.status === "rejected" ? "destructive" : "default"
                  }
                >
                  {busy
                    ? "กำลังบันทึก…"
                    : review.status === "approved"
                      ? "ยืนยันอนุมัติ"
                      : "ยืนยันไม่อนุมัติ"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Modal>
      )}
      {employeeAction && (
        <Modal
          title={
            employeeAction.active
              ? "ปิดใช้งานบัญชีพนักงาน"
              : "เปิดใช้งานบัญชีพนักงาน"
          }
          onClose={close}
        >
          <DialogDescription>
            {employeeAction.name} ({employeeAction.username}) ·{" "}
            {employeeAction.active
              ? "จะไม่สามารถเข้าสู่ระบบได้ โดยประวัติลงเวลาและใบลายังคงอยู่"
              : "จะสามารถเข้าสู่ระบบด้วยบัญชีเดิมได้อีกครั้ง"}
          </DialogDescription>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={close}>
              ยกเลิก
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                save(
                  {
                    action: "set-employee-active",
                    id: employeeAction.id,
                    active: !employeeAction.active,
                  },
                  "อัปเดตสถานะพนักงานแล้ว",
                )
              }
            >
              {busy ? "กำลังบันทึก…" : "ยืนยัน"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
