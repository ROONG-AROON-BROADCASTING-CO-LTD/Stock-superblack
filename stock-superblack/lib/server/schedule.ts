import { randomInt, randomUUID } from "node:crypto";
import type { Database, ScheduleSettings, WorkSchedule, WorkShift } from "@/lib/types";

const day = 86_400_000;
function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function scheduleDates(start: string, end: string): string[] {
  if (!isDate(start) || !isDate(end) || start > end)
    throw Error("กรุณาระบุช่วงวันที่ให้ถูกต้อง");
  const count = Math.round((Date.parse(end) - Date.parse(start)) / day) + 1;
  if (count > 31) throw Error("เลือกช่วงวันที่ได้ไม่เกิน 31 วันต่อครั้ง");
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(start) + i * day).toISOString().slice(0, 10));
}

export function parseScheduleSettings(input: unknown): ScheduleSettings {
  if (!input || typeof input !== "object") throw Error("กรุณาระบุการตั้งค่าตาราง");
  const value = input as Record<string, unknown>;
  if (value.mode !== "days-off" && value.mode !== "shifts" && value.mode !== "both")
    throw Error("เลือกสุ่มวันหยุด สุ่มกะ หรือทั้งสองอย่าง");
  const dates = scheduleDates(value.start as string, value.end as string);
  if (!Array.isArray(value.employeeIds) || !value.employeeIds.length || value.employeeIds.length > 100 ||
    value.employeeIds.some((id) => typeof id !== "string" || !id || id.length > 120) ||
    new Set(value.employeeIds).size !== value.employeeIds.length)
    throw Error("เลือกพนักงาน 1–100 คนโดยไม่ซ้ำกัน");
  const daysOff = value.mode === "shifts" ? 0 : value.daysOff;
  if (typeof daysOff !== "number" || !Number.isInteger(daysOff) || daysOff < 0 || daysOff > dates.length)
    throw Error("จำนวนวันหยุดต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึงจำนวนวันในช่วงที่เลือก");
  let shifts: WorkShift[] = [];
  if (value.mode !== "days-off") {
    if (!Array.isArray(value.shifts) || !value.shifts.length || value.shifts.length > 8)
      throw Error("กำหนดกะอย่างน้อย 1 กะ และไม่เกิน 8 กะ");
    shifts = value.shifts.map((shift: unknown) => {
      if (!shift || typeof shift !== "object") throw Error("ข้อมูลกะไม่ถูกต้อง");
      const s = shift as Record<string, unknown>;
      if (typeof s.id !== "string" || !s.id || s.id.length > 80 ||
        typeof s.name !== "string" || !s.name.trim() || s.name.length > 60 ||
        typeof s.start !== "string" || typeof s.end !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end) || s.start >= s.end)
        throw Error("ระบุชื่อและเวลากะให้ถูกต้อง เวลาเริ่มต้องก่อนเวลาสิ้นสุดในวันเดียวกัน");
      return { id: s.id, name: s.name.trim(), start: s.start, end: s.end };
    });
    if (new Set(shifts.map((s) => s.id)).size !== shifts.length || new Set(shifts.map((s) => s.name)).size !== shifts.length)
      throw Error("ชื่อและรหัสกะต้องไม่ซ้ำกัน");
  }
  return { mode: value.mode, start: value.start as string, end: value.end as string,
    employeeIds: value.employeeIds as string[], daysOff, shifts };
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateSchedule(data: Database, input: unknown, createdBy: string): WorkSchedule {
  const settings = parseScheduleSettings(input);
  const dates = scheduleDates(settings.start, settings.end);
  const employees = settings.employeeIds.map((id) => {
    const employee = data.employees.find((item) => item.id === id && item.active);
    if (!employee) throw Error("พบพนักงานที่ไม่มีอยู่หรือปิดใช้งานแล้ว กรุณารีเฟรชรายชื่อ");
    const { name, username, department } = employee;
    return { id, name, username, department };
  });
  const approvedLeaves = data.leaves.filter((leave) => leave.status === "approved");
  const leaveDates = new Map(employees.map((employee) => [employee.id, new Set(dates.filter((date) =>
    approvedLeaves.some((leave) => leave.username === employee.username && leave.start <= date && leave.end >= date),
  ))]));
  const offDates = new Map<string, Set<string>>();
  const offCounts = new Map(dates.map((date) => [date, 0]));
  for (const employee of shuffled(employees)) {
    const candidates = shuffled(dates.filter((date) => !leaveDates.get(employee.id)!.has(date)));
    if (candidates.length < settings.daysOff)
      throw Error(`${employee.name}: วันว่างไม่พอสำหรับจำนวนวันหยุดที่กำหนด เนื่องจากมีใบลาอนุมัติ`);
    // Randomize ties, then spread days off across the least-used dates.
    candidates.sort((a, b) => offCounts.get(a)! - offCounts.get(b)!);
    const selected = candidates.slice(0, settings.daysOff);
    offDates.set(employee.id, new Set(selected));
    selected.forEach((date) => offCounts.set(date, offCounts.get(date)! + 1));
  }
  const personalShifts = new Map<string, Map<string, number>>();
  const entries: WorkSchedule["entries"] = [];
  for (const date of dates) {
    const dailyShifts = new Map(settings.shifts.map((shift) => [shift.id, 0]));
    for (const employee of shuffled(employees)) {
      const status = leaveDates.get(employee.id)!.has(date) ? "leave" : offDates.get(employee.id)!.has(date) ? "day-off" : "work";
      let shiftId: string | null = null;
      if (status === "work" && settings.mode !== "days-off") {
        const counts = personalShifts.get(employee.id) ?? new Map<string, number>();
        const candidates = shuffled(settings.shifts).sort((a, b) =>
          dailyShifts.get(a.id)! - dailyShifts.get(b.id)! || (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
        shiftId = candidates[0].id;
        dailyShifts.set(shiftId, dailyShifts.get(shiftId)! + 1);
        counts.set(shiftId, (counts.get(shiftId) ?? 0) + 1);
        personalShifts.set(employee.id, counts);
      }
      entries.push({ employeeId: employee.id, date, status, shiftId });
    }
  }
  return { id: randomUUID(), createdAt: new Date().toISOString(), createdBy, settings, employees, entries };
}
