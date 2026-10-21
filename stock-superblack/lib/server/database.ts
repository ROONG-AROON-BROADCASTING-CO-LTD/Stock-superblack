import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { Database } from "@/lib/types";
const directory = path.join(process.cwd(), ".data");
const file = path.join(directory, "database.json");
let queue: Promise<unknown> = Promise.resolve();
export async function readDatabase(): Promise<Database> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { products: [], attendance: [], leaves: [] };
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
