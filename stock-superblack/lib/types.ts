export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum: number;
  updatedAt: string;
};
export type Attendance = {
  id: string;
  username: string;
  checkIn: string;
  checkOut: string | null;
};
export type Leave = {
  id: string;
  username: string;
  type: string;
  start: string;
  end: string;
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};
export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "employee";
};
export type Employee = {
  id: string;
  username: string;
  name: string;
  department: string;
  active: boolean;
  createdAt: string;
};
export type StockMovement = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  before: number;
  after: number;
  change: number;
  kind: "created" | "adjusted" | "updated";
  username: string;
  createdAt: string;
};
export type WorkspaceData = {
  products: Product[];
  attendance: Attendance[];
  leaves: Leave[];
};
export type Database = WorkspaceData & {
  employees: (Employee & { passwordHash: string })[];
  stockMovements: StockMovement[];
  schedules: WorkSchedule[];
};
export type AdminData = {
  employees: Employee[];
  leaves: Leave[];
  stockMovements: StockMovement[];
};

export type ScheduleMode = "days-off" | "shifts" | "both";
export type WorkShift = { id: string; name: string; start: string; end: string };
export type ScheduleSettings = {
  mode: ScheduleMode;
  start: string;
  end: string;
  employeeIds: string[];
  daysOff: number;
  shifts: WorkShift[];
};
export type ScheduleEntry = {
  employeeId: string;
  date: string;
  status: "day-off" | "work" | "leave";
  shiftId: string | null;
};
export type WorkSchedule = {
  id: string;
  createdAt: string;
  createdBy: string;
  settings: ScheduleSettings;
  employees: Pick<Employee, "id" | "name" | "username" | "department">[];
  entries: ScheduleEntry[];
};
