"use client";

import { useEffect, useState } from "react";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { date, dateTime } from "@/lib/format";
import type { Employee, ScheduleMode, ScheduleSettings, WorkSchedule, WorkShift } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

const modes: Record<ScheduleMode, string> = {
  "days-off": "สุ่มเฉพาะวันหยุด",
  shifts: "สุ่มเฉพาะกะเข้างาน",
  both: "สุ่มวันหยุดและกะเข้างาน",
};
const defaultShifts: WorkShift[] = [
  { id: "morning", name: "กะเช้า", start: "07:00", end: "15:00" },
  { id: "afternoon", name: "กะบ่าย", start: "12:00", end: "20:00" },
];
function defaults(employees: Employee[]): ScheduleSettings {
  const start = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const end = new Date(Date.parse(start) + 6 * 86400000).toISOString().slice(0, 10);
  return { mode: "both", start, end, employeeIds: employees.filter((e) => e.active).map((e) => e.id), daysOff: 1, shifts: defaultShifts };
}

export function SchedulePanel({ employees }: { employees: Employee[] }) {
  const [settings, setSettings] = useState(() => defaults(employees));
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const activeEmployees = employees.filter((e) => e.active);
  const selectedEmployees = activeEmployees.filter((e) => settings.employeeIds.includes(e.id));
  const selected = schedules.find((s) => s.id === selectedId);

  useEffect(() => {
    let active = true;
    api("/api/admin/schedules").then((result: { schedules: WorkSchedule[] }) => {
      if (!active) return;
      setSchedules(result.schedules);
      setSelectedId(result.schedules[0]?.id ?? "");
    }).catch((e: Error) => {
      if (active) setError(e.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  function change<K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }
  function changeShift(id: string, key: "name" | "start" | "end", value: string) {
    setSettings((current) => ({ ...current, shifts: current.shifts.map((s) => s.id === id ? { ...s, [key]: value } : s) }));
  }
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result: { schedule: WorkSchedule } = await api("/api/admin/schedules", {
        ...settings, employeeIds: selectedEmployees.map((employee) => employee.id),
      });
      setSchedules((current) => [result.schedule, ...current]);
      setSelectedId(result.schedule.id);
      toast.success("สุ่มและบันทึกตารางเรียบร้อยแล้ว");
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle><h2>ตั้งค่าสุ่มตารางงาน</h2></CardTitle>
          <CardDescription>เลือกสิ่งที่ต้องการสุ่มและพนักงาน แต่ละครั้งจะสร้างตารางใหม่โดยเก็บตารางเดิมไว้</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="schedule-form" onSubmit={generate} aria-busy={busy}>
            <FieldSet disabled={busy || loading}>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="schedule-mode">รูปแบบการสุ่ม</FieldLabel>
                    <NativeSelect id="schedule-mode" value={settings.mode} onChange={(e) => change("mode", e.target.value as ScheduleMode)}>
                      {Object.entries(modes).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="schedule-start">วันที่เริ่มต้น</FieldLabel>
                    <Input id="schedule-start" type="date" value={settings.start} onChange={(e) => change("start", e.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="schedule-end">วันที่สิ้นสุด</FieldLabel>
                    <Input id="schedule-end" type="date" min={settings.start} value={settings.end} onChange={(e) => change("end", e.target.value)} required />
                    <FieldDescription>ช่วงวันที่ไม่เกิน 31 วัน</FieldDescription>
                  </Field>
                </div>
                {settings.mode !== "shifts" ? (
                  <Field className="max-w-md">
                    <FieldLabel htmlFor="schedule-days-off">วันหยุดต่อคนในช่วงวันที่เลือก</FieldLabel>
                    <Input id="schedule-days-off" type="number" min={0} max={31} step={1} value={settings.daysOff} onChange={(e) => change("daysOff", e.target.value === "" ? 0 : Number(e.target.value))} required />
                    <FieldDescription>จำนวนรวมตลอดช่วงวันที่ ไม่รวมใบลาที่อนุมัติแล้ว ระบบจะช่วยกระจายวันหยุดระหว่างพนักงาน</FieldDescription>
                  </Field>
                ) : <Alert><AlertDescription>โหมดนี้จัดกะทุกวันในช่วงที่เลือก ยกเว้นวันลาที่อนุมัติแล้ว โดยไม่เพิ่มวันหยุดจากการสุ่ม</AlertDescription></Alert>}
                {settings.mode !== "days-off" && (
                  <FieldSet>
                    <FieldLegend>กะที่ใช้สุ่ม</FieldLegend>
                    <FieldDescription>แก้ชื่อกะและเวลาได้ รองรับกะที่เริ่มและสิ้นสุดในวันเดียวกัน สูงสุด 8 กะ</FieldDescription>
                    {settings.shifts.map((shift, index) => (
                      <div key={shift.id} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <Field>
                          <FieldLabel htmlFor={`shift-name-${shift.id}`}>ชื่อกะ {index + 1}</FieldLabel>
                          <Input id={`shift-name-${shift.id}`} value={shift.name} maxLength={60} required onChange={(e) => changeShift(shift.id, "name", e.target.value)} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`shift-start-${shift.id}`}>เวลาเข้า กะ {index + 1}</FieldLabel>
                          <Input id={`shift-start-${shift.id}`} type="time" value={shift.start} required onChange={(e) => changeShift(shift.id, "start", e.target.value)} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`shift-end-${shift.id}`}>เวลาออก กะ {index + 1}</FieldLabel>
                          <Input id={`shift-end-${shift.id}`} type="time" value={shift.end} required onChange={(e) => changeShift(shift.id, "end", e.target.value)} />
                        </Field>
                        <Button type="button" variant="ghost" size="icon" disabled={settings.shifts.length <= 1} aria-label={`ลบกะ ${index + 1}`} onClick={() => change("shifts", settings.shifts.filter((s) => s.id !== shift.id))}><Trash2 /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="self-start" disabled={settings.shifts.length >= 8} onClick={() => change("shifts", [...settings.shifts, { id: crypto.randomUUID(), name: "", start: "09:00", end: "17:00" }])}><Plus data-icon="inline-start" />เพิ่มกะ</Button>
                  </FieldSet>
                )}
                <FieldSet>
                  <FieldLegend>พนักงานที่ร่วมสุ่ม ({selectedEmployees.length} คน)</FieldLegend>
                  {activeEmployees.length ? (
                    <>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => change("employeeIds", activeEmployees.map((e) => e.id))}>เลือกทั้งหมด</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => change("employeeIds", [])}>ล้างการเลือก</Button>
                      </div>
                      <div className="grid max-h-64 gap-3 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3">
                        {activeEmployees.map((employee) => (
                          <Field key={employee.id} orientation="horizontal">
                            <Checkbox id={`schedule-employee-${employee.id}`} checked={settings.employeeIds.includes(employee.id)} onCheckedChange={(checked) => change("employeeIds", checked ? [...settings.employeeIds, employee.id] : settings.employeeIds.filter((id) => id !== employee.id))} />
                            <FieldLabel htmlFor={`schedule-employee-${employee.id}`} className="min-w-0 flex-wrap">{employee.name}{employee.department ? ` · ${employee.department}` : ""}</FieldLabel>
                          </Field>
                        ))}
                      </div>
                    </>
                  ) : <Alert><AlertDescription>ยังไม่มีพนักงานที่เปิดใช้งาน กรุณาเพิ่มพนักงานในแท็บ “พนักงาน” ก่อนสุ่มตาราง</AlertDescription></Alert>}
                </FieldSet>
                <FieldDescription>ใบลาที่อนุมัติ ณ เวลาสุ่มจะแสดงเป็น “ลา” และไม่มีกะ ตารางนี้ใช้สำหรับวางแผนในหน้าแอดมิน</FieldDescription>
              </FieldGroup>
            </FieldSet>
          </form>
          {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
        <CardFooter className="flex-wrap gap-3">
          <Button type="submit" form="schedule-form" disabled={busy || loading || !selectedEmployees.length}><Shuffle data-icon="inline-start" />{busy ? "กำลังสุ่มและบันทึก…" : "สุ่มและบันทึกตาราง"}</Button>
          {error && <Button type="button" variant="outline" disabled={busy || loading} onClick={() => { setError(""); setLoading(true); setRetry((n) => n + 1); }}>โหลดตารางอีกครั้ง</Button>}
          {loading && <span role="status" className="text-sm text-muted-foreground">กำลังโหลดตาราง…</span>}
        </CardFooter>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle><h2>ผลการสุ่มและตารางที่บันทึก</h2></CardTitle>
          <CardDescription>เลือกดูตารางย้อนหลัง หรือใช้การตั้งค่าเดิมเพื่อสุ่มตารางใหม่</CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {schedules.length > 0 && (
            <Field>
              <FieldLabel htmlFor="schedule-history">ตารางที่บันทึก ({schedules.length})</FieldLabel>
              <NativeSelect id="schedule-history" className="max-w-full" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {schedules.map((schedule, index) => <NativeSelectOption key={schedule.id} value={schedule.id}>#{schedules.length - index} · {date(schedule.settings.start)} – {date(schedule.settings.end)} · {modes[schedule.settings.mode]}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          )}
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <Badge variant="secondary">{modes[selected.settings.mode]}</Badge>
                  <p className="text-sm">{date(selected.settings.start)} – {date(selected.settings.end)} · {selected.employees.length} คน</p>
                  <p className="text-xs text-muted-foreground">บันทึก {dateTime(selected.createdAt)} โดย {selected.createdBy}</p>
                </div>
                <Button type="button" variant="outline" disabled={busy || loading} onClick={() => {
                  setSettings({ ...selected.settings, employeeIds: selected.settings.employeeIds.filter((id) => activeEmployees.some((e) => e.id === id)), shifts: selected.settings.shifts.length ? selected.settings.shifts : defaultShifts });
                  toast.success("นำการตั้งค่ามาใช้แล้ว ปรับค่าและกดสุ่มเพื่อสร้างตารางใหม่");
                }}>ใช้การตั้งค่านี้</Button>
              </div>
              <ScheduleTable schedule={selected} />
            </>
          ) : !loading && <Empty><EmptyHeader><EmptyTitle>ยังไม่มีตารางที่บันทึก</EmptyTitle><EmptyDescription>ตั้งค่าด้านบน แล้วกดสุ่มและบันทึกตารางเพื่อเริ่มต้น</EmptyDescription></EmptyHeader></Empty>}
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleTable({ schedule }: { schedule: WorkSchedule }) {
  const dates = [...new Set(schedule.entries.map((e) => e.date))].sort();
  const entries = new Map(schedule.entries.map((e) => [`${e.employeeId}:${e.date}`, e]));
  const shifts = new Map(schedule.settings.shifts.map((s) => [s.id, s]));
  return (
    <Table aria-label="ผลการสุ่มตารางงาน">
      <TableHeader><TableRow><TableHead>พนักงาน</TableHead>{dates.map((day) => <TableHead key={day}>{date(day)}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {schedule.employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell><div>{employee.name}</div><div className="text-xs text-muted-foreground">{employee.department}</div></TableCell>
            {dates.map((day) => {
              const entry = entries.get(`${employee.id}:${day}`)!;
              const shift = entry.shiftId ? shifts.get(entry.shiftId) : null;
              return <TableCell key={day}>{entry.status === "leave" ? <Badge variant="outline">ลา</Badge> : entry.status === "day-off" ? <Badge variant="secondary">หยุด</Badge> : shift ? <><div>{shift.name}</div><div className="text-xs text-muted-foreground">{shift.start}–{shift.end}</div></> : <span className="text-muted-foreground">ทำงาน · ยังไม่จัดกะ</span>}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
