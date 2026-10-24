import type {
  AdminData,
  Database,
  SessionUser,
  WorkspaceData,
} from "@/lib/types";

export function workspaceView(
  data: Database,
  user: SessionUser,
): WorkspaceData {
  return {
    products: data.products,
    attendance: data.attendance.filter(
      (item) => item.username === user.username,
    ),
    leaves: data.leaves.filter((item) => item.username === user.username),
  };
}

export function adminView(data: Database): AdminData {
  return {
    employees: data.employees.map(
      ({ id, username, name, department, active, createdAt }) => ({
        id,
        username,
        name,
        department,
        active,
        createdAt,
      }),
    ),
    leaves: data.leaves,
    stockMovements: data.stockMovements,
  };
}
