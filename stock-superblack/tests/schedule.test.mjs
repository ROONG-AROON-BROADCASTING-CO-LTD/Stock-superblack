import { expect, test } from "bun:test";
import { generateSchedule, parseScheduleSettings, scheduleDates } from "../lib/server/schedule";

function database() {
  return {
    products: [], attendance: [], stockMovements: [], schedules: [],
    employees: Array.from({ length: 5 }, (_, i) => ({
      id: `employee-${i}`, name: `คนที่ ${i}`, username: `staff${i}@example.test`,
      department: "หน้าร้าน", passwordHash: "never-expose", active: true, createdAt: "2026-01-01",
    })),
    leaves: [{ id: "leave", username: "staff0@example.test", start: "2026-11-03", end: "2026-11-04", type: "ลากิจ", reason: "", status: "approved", createdAt: "", reviewedAt: "", reviewedBy: "admin", reviewNote: "" }],
  };
}
function settings() {
  return { mode: "both", start: "2026-11-01", end: "2026-11-07", employeeIds: database().employees.map((e) => e.id), daysOff: 2,
    shifts: [{ id: "a", name: "เช้า", start: "07:00", end: "15:00" }, { id: "b", name: "บ่าย", start: "12:00", end: "20:00" }] };
}

test("all three modes assign every employee/date once, respect leave and exact holiday quotas", () => {
  for (const mode of ["days-off", "shifts", "both"]) {
    for (let iteration = 0; iteration < 20; iteration++) {
      const result = generateSchedule(database(), { ...settings(), mode }, "admin");
      expect(result.entries).toHaveLength(35);
      expect(new Set(result.entries.map((e) => `${e.employeeId}:${e.date}`)).size).toBe(35);
      expect(JSON.stringify(result)).not.toContain("never-expose");
      for (const employee of result.employees) {
        const entries = result.entries.filter((e) => e.employeeId === employee.id);
        expect(entries.filter((e) => e.status === "day-off")).toHaveLength(mode === "shifts" ? 0 : 2);
        for (const entry of entries) {
          if (entry.status !== "work" || mode === "days-off") expect(entry.shiftId).toBeNull();
          else expect(["a", "b"]).toContain(entry.shiftId);
        }
      }
      expect(result.entries.filter((e) => e.employeeId === "employee-0" && ["2026-11-03", "2026-11-04"].includes(e.date)).every((e) => e.status === "leave")).toBe(true);
      if (mode !== "days-off") {
        for (const date of scheduleDates(result.settings.start, result.settings.end)) {
          const entries = result.entries.filter((e) => e.date === date);
          expect(Math.abs(entries.filter((e) => e.shiftId === "a").length - entries.filter((e) => e.shiftId === "b").length)).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test("only selected active employees participate, and non-approved leave does not block work", () => {
  const db = database();
  db.leaves[0].status = "pending";
  const result = generateSchedule(db, { ...settings(), mode: "shifts", employeeIds: ["employee-0"] }, "admin");
  expect(result.employees).toHaveLength(1);
  expect(result.entries).toHaveLength(7);
  expect(result.entries.every((e) => e.status === "work")).toBe(true);
  db.employees[0].active = false;
  expect(() => generateSchedule(db, settings(), "admin")).toThrow("ปิดใช้งาน");
  expect(() => generateSchedule(database(), { ...settings(), employeeIds: ["missing"] }, "admin")).toThrow();
});

test("holiday-only ignores unused shift settings and shift-only ignores unused holiday count", () => {
  expect(parseScheduleSettings({ ...settings(), mode: "days-off", shifts: null }).shifts).toEqual([]);
  expect(parseScheduleSettings({ ...settings(), mode: "shifts", daysOff: 999 }).daysOff).toBe(0);
  const result = generateSchedule(database(), { ...settings(), daysOff: 0 }, "admin");
  expect(result.entries.some((e) => e.status === "day-off")).toBe(false);
});

test("invalid dates, impossible quotas, malformed input and invalid shifts are rejected", () => {
  for (const value of [null, [], {}, { ...settings(), mode: "unknown" }, { ...settings(), start: "2026-02-30" },
    { ...settings(), end: "2026-10-30" }, { ...settings(), end: "2026-12-31" },
    { ...settings(), daysOff: -1 }, { ...settings(), daysOff: 1.5 }, { ...settings(), daysOff: 8 },
    { ...settings(), employeeIds: [] }, { ...settings(), employeeIds: ["employee-0", "employee-0"] },
    { ...settings(), shifts: [] }, { ...settings(), shifts: [null] },
    { ...settings(), shifts: [{ id: "a", name: "bad", start: "22:00", end: "06:00" }] },
    { ...settings(), shifts: [{ id: "a", name: "bad", start: "25:00", end: "26:00" }] },
    { ...settings(), shifts: [settings().shifts[0], settings().shifts[0]] },
  ]) expect(() => generateSchedule(database(), value, "admin")).toThrow();
  expect(() => generateSchedule(database(), { ...settings(), daysOff: 6 }, "admin")).toThrow("วันว่างไม่พอ");
  expect(scheduleDates("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
});

test("generation preserves the database and past schedules", () => {
  const db = database();
  const previous = generateSchedule(db, settings(), "admin");
  db.schedules.push(previous);
  const snapshot = JSON.stringify(db);
  const next = generateSchedule(db, { ...settings(), mode: "shifts" }, "admin");
  expect(next.id).not.toBe(previous.id);
  expect(JSON.stringify(db)).toBe(snapshot);
});
