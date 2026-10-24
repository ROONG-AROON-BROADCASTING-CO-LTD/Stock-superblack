import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";

const directory = await mkdtemp(path.join(tmpdir(), "superblack-admin-test-"));
process.env.WORKSPACE_DATA_DIR = directory;
process.env.AUTH_USERNAME = "admin@example.test";
process.env.AUTH_PASSWORD = "test-admin-password";
const jar = new Map();
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name, value) => jar.set(name, value),
    delete: (name) => jar.delete(name),
  }),
}));
const auth = await import("../app/api/auth/route.ts");
const admin = await import("../app/api/admin/route.ts");
const workspace = await import("../app/api/workspace/route.ts");
const { readDatabase } = await import("../lib/server/database.ts");
const request = (body) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const signIn = (
  username = process.env.AUTH_USERNAME,
  password = process.env.AUTH_PASSWORD,
) => auth.POST(request({ username, password }));
const createEmployee = (username = "employee@example.test") =>
  admin.POST(
    request({
      action: "create-employee",
      employee: {
        name: "พนักงานทดสอบ",
        username,
        department: "คลังสินค้า",
        password: "employee-test-password",
      },
    }),
  );
const submitLeave = (reason = "ทดสอบการลา") =>
  workspace.POST(
    request({
      action: "leave",
      leave: {
        type: "ลากิจ",
        start: "2026-11-01",
        end: "2026-11-02",
        reason,
        status: "approved",
        username: "spoof@example.test",
      },
    }),
  );

beforeEach(async () => {
  jar.clear();
  await writeFile(
    path.join(directory, "database.json"),
    JSON.stringify({
      products: [],
      attendance: [],
      leaves: [],
      employees: [],
      stockMovements: [],
    }),
  );
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("admin requires authentication; employee cannot read or mutate admin data", async () => {
  expect((await admin.GET()).status).toBe(401);
  await signIn();
  expect((await createEmployee()).status).toBe(200);
  await signIn("employee@example.test", "employee-test-password");
  expect((await auth.GET()).status).toBe(200);
  expect((await admin.GET()).status).toBe(403);
  expect((await createEmployee("unauthorized@example.test")).status).toBe(403);
  expect(
    (
      await admin.POST(
        request({
          action: "review-leave",
          id: "anything",
          status: "approved",
          note: "",
        }),
      )
    ).status,
  ).toBe(403);
  expect((await workspace.GET()).status).toBe(200);
});

test("employee registry excludes admin, hashes passwords, rejects duplicate identities, and revokes disabled access", async () => {
  await signIn();
  expect((await (await admin.GET()).json()).employees).toHaveLength(0);
  const response = await createEmployee();
  const data = await response.json();
  expect(data.employees).toHaveLength(1);
  expect(JSON.stringify(data)).not.toContain("password");
  const stored = await readFile(path.join(directory, "database.json"), "utf8");
  expect(stored).not.toContain("employee-test-password");
  expect(stored).toContain("passwordHash");
  expect((await createEmployee("EMPLOYEE@example.test")).status).toBe(400);
  expect((await createEmployee("ADMIN@example.test")).status).toBe(400);
  await signIn("employee@example.test", "employee-test-password");
  const employeeCookie = jar.get("superblack-session");
  await signIn();
  expect(
    (
      await admin.POST(
        request({
          action: "set-employee-active",
          id: data.employees[0].id,
          active: false,
        }),
      )
    ).status,
  ).toBe(200);
  jar.set("superblack-session", employeeCookie);
  expect((await workspace.GET()).status).toBe(401);
  expect(
    (await signIn("employee@example.test", "employee-test-password")).status,
  ).toBe(401);
});

test("leave submission stays pending, is private to its owner, and approval persists with reviewer", async () => {
  await signIn();
  await createEmployee();
  await createEmployee("other@example.test");
  await signIn("employee@example.test", "employee-test-password");
  const submitted = await (await submitLeave()).json();
  const leave = submitted.leaves[0];
  expect(leave.status).toBe("pending");
  expect(leave.username).toBe("employee@example.test");
  expect(submitted.employees).toBeUndefined();
  expect(submitted.stockMovements).toBeUndefined();
  await signIn("other@example.test", "employee-test-password");
  expect((await (await workspace.GET()).json()).leaves).toHaveLength(0);
  await signIn();
  const reviewed = await admin.POST(
    request({
      action: "review-leave",
      id: leave.id,
      status: "approved",
      note: "อนุมัติตามคำขอ",
    }),
  );
  expect(reviewed.status).toBe(200);
  await signIn("employee@example.test", "employee-test-password");
  const current = (await (await workspace.GET()).json()).leaves[0];
  expect(current.status).toBe("approved");
  expect(current.reviewedBy).toBe(process.env.AUTH_USERNAME);
  expect(current.reviewedAt).toBeTruthy();
  expect(current.reviewNote).toBe("อนุมัติตามคำขอ");
});

test("rejection requires a reason and simultaneous reviews cannot overwrite each other", async () => {
  await signIn();
  const leave = (await (await submitLeave()).json()).leaves[0];
  expect(
    (
      await admin.POST(
        request({
          action: "review-leave",
          id: leave.id,
          status: "rejected",
          note: " ",
        }),
      )
    ).status,
  ).toBe(400);
  const responses = await Promise.all([
    admin.POST(
      request({
        action: "review-leave",
        id: leave.id,
        status: "rejected",
        note: "ต้องจัดตารางใหม่",
      }),
    ),
    admin.POST(
      request({
        action: "review-leave",
        id: leave.id,
        status: "approved",
        note: "",
      }),
    ),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
  expect((await readDatabase()).leaves[0].status).toBe("rejected");
});

test("stock audit tracks additions, decreases, metadata edits and actor; stale writes do not change stock", async () => {
  await signIn();
  await createEmployee();
  await signIn("employee@example.test", "employee-test-password");
  let product = {
    sku: "TEST-01",
    name: "สินค้าทดสอบ",
    category: "ทดสอบ",
    quantity: 10,
    unit: "ชิ้น",
    minimum: 2,
  };
  let result = await workspace.POST(
    request({
      action: "save-product",
      product,
      username: "spoof@example.test",
    }),
  );
  expect(result.status).toBe(200);
  product = (await result.json()).products[0];
  const original = { ...product };
  for (const quantity of [15, 12, 12]) {
    result = await workspace.POST(
      request({ action: "save-product", product: { ...product, quantity } }),
    );
    expect(result.status).toBe(200);
    product = (await result.json()).products[0];
  }
  expect(
    (
      await workspace.POST(
        request({
          action: "save-product",
          product: { ...original, quantity: 99 },
        }),
      )
    ).status,
  ).toBe(400);
  await signIn();
  const data = await (await admin.GET()).json();
  expect(data.stockMovements.map((item) => item.change)).toEqual([
    0, -3, 5, 10,
  ]);
  expect(
    data.stockMovements.every(
      (item) => item.username === "employee@example.test",
    ),
  ).toBe(true);
  expect((await readDatabase()).products[0].quantity).toBe(12);
});

test("old databases retain products and leaves, with pending status and no fabricated stock history", async () => {
  const oldLeave = {
    id: "legacy",
    username: process.env.AUTH_USERNAME,
    type: "ลากิจ",
    start: "2026-10-01",
    end: "2026-10-01",
    reason: "รายการเดิม",
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(directory, "database.json"),
    JSON.stringify({ products: [], attendance: [], leaves: [oldLeave] }),
  );
  await signIn();
  const data = await (await admin.GET()).json();
  expect(data.leaves[0]).toMatchObject({
    id: "legacy",
    status: "pending",
    reviewedBy: null,
  });
  expect(data.stockMovements).toEqual([]);
  expect(data.employees).toEqual([]);
  expect(
    (
      await admin.POST(
        request({
          action: "review-leave",
          id: "legacy",
          status: "approved",
          note: "",
        }),
      )
    ).status,
  ).toBe(200);
  expect((await readDatabase()).leaves[0].status).toBe("approved");
});

test("forged, malformed and expired sessions are rejected; legacy admin cookie still works", async () => {
  await signIn();
  const valid = jar.get("superblack-session");
  for (const token of [
    "malformed",
    valid.replace("admin", "someone"),
    `0.admin.${"a".repeat(64)}`,
  ]) {
    jar.set("superblack-session", token);
    expect((await admin.GET()).status).toBe(401);
  }
  const expires = String(Date.now() + 60000);
  const signature = createHmac("sha256", process.env.AUTH_PASSWORD)
    .update(expires)
    .digest("hex");
  jar.set("superblack-session", `${expires}.${signature}`);
  expect((await admin.GET()).status).toBe(200);
});

test("invalid calendar dates and reversed ranges are rejected", async () => {
  await signIn();
  for (const [start, end] of [
    ["2026-02-30", "2026-03-02"],
    ["2026-11-02", "2026-11-01"],
  ]) {
    expect(
      (
        await workspace.POST(
          request({
            action: "leave",
            leave: { type: "ลากิจ", start, end, reason: "ทดสอบ" },
          }),
        )
      ).status,
    ).toBe(400);
  }
});
