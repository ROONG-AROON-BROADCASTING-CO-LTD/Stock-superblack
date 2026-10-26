import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { Database } from "@/lib/types";
const directory =
  process.env.WORKSPACE_DATA_DIR || path.join(process.cwd(), ".data");
const file = path.join(directory, "database.json");
let queue: Promise<unknown> = Promise.resolve();
export async function readDatabase(): Promise<Database> {
  try {
    const data = JSON.parse(await readFile(file, "utf8")) as Database;
    return {
      ...data,
      employees: data.employees ?? [],
      stockMovements: data.stockMovements ?? [],
      schedules: data.schedules ?? [],
      leaves: data.leaves.map((leave) => ({
        ...leave,
        status: leave.status ?? "pending",
        reviewedBy: leave.reviewedBy ?? null,
        reviewedAt: leave.reviewedAt ?? null,
        reviewNote: leave.reviewNote ?? "",
      })),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return {
        products: [],
        attendance: [],
        leaves: [],
        employees: [],
        stockMovements: [],
        schedules: [],
      };
    throw error;
  }
}
export function updateDatabase<T>(change: (data: Database) => T): Promise<T> {
  const task = queue.then(async () => {
    const data = await readDatabase();
    const result = change(data);
    await mkdir(directory, { recursive: true });
    await writeFile(`${file}.tmp`, JSON.stringify(data, null, 2));
    await rename(`${file}.tmp`, file);
    return result;
  });
  queue = task.catch(() => undefined);
  return task;
}
