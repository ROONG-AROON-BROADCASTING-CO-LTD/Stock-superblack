"use client";
import { useState } from "react";
import {
  Box,
  Boxes,
  TriangleAlert,
  Plus,
  Download,
  Pencil,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { Modal } from "@/components/dashboard/modal";

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
  EmptyContent,
} from "@/components/ui/empty";
import { DialogDescription } from "@/components/ui/dialog";

export function Inventory({
  products,
  mutate,
}: {
  products: Product[];
  mutate: (body: unknown) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const visible = products.filter(
    (p) =>
      `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()) &&
      (!category || p.category === category) &&
      (!status || (p.quantity <= p.minimum ? "low" : "ready") === status),
  );
  const product = editing && editing !== "new" ? editing : null;
  function close() {
    setEditing(null);
    setExporting(false);
    setError("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await mutate({
        action: "save-product",
        product: {
          ...f,
          id: product?.id,
          updatedAt: product?.updatedAt,
          quantity: Number(f.quantity),
          minimum: Number(f.minimum),
        },
      });
      close();
      toast.success("บันทึกข้อมูลสินค้าเรียบร้อยแล้ว");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportExcel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const name = new FormData(event.currentTarget).get("name");
    try {
      const response = await fetch("/api/inventory/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "superblack-inventory.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      close();
      toast.success("ส่งออก Excel เรียบร้อยแล้ว");
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
          <h1 className="text-2xl font-semibold">สต๊อกสินค้า</h1>
          <p className="text-muted-foreground">
            จัดการสินค้า ตรวจสอบจำนวนคงเหลือ และอัปเดตสต๊อกของคุณ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              setExporting(true);
            }}
          >
            <Download data-icon="inline-start" />
            ส่งออก Excel
          </Button>
          <Button
            onClick={() => {
              setError("");
              setEditing("new");
            }}
          >
            <Plus data-icon="inline-start" />
            เพิ่มสินค้า
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "สินค้าทั้งหมด",
            value: products.length,
            unit: "รายการ",
            icon: Box,
          },
          {
            title: "จำนวนสินค้าในสต๊อก",
            value: products.reduce((sum, p) => sum + p.quantity, 0),
            unit: "หน่วย",
            icon: Boxes,
          },
          {
            title: "สินค้าคงเหลือน้อย",
            value: products.filter((p) => p.quantity <= p.minimum).length,
            unit: "รายการ",
            icon: TriangleAlert,
          },
        ].map(({ title, value, unit, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <CardDescription>{title}</CardDescription>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {value.toLocaleString()} {unit}
                </span>
                <Icon />
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
          <CardDescription>
            {products.length} รายการในคลังของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              aria-label="ค้นหาสินค้า"
              placeholder="ค้นหารหัสสินค้า หรือชื่อสินค้า…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <NativeSelect
              aria-label="กรองหมวดหมู่"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <NativeSelectOption value="">ทุกหมวดหมู่</NativeSelectOption>
              {[...new Set(products.map((p) => p.category))]
                .filter(Boolean)
                .map((c) => (
                  <NativeSelectOption key={c}>{c}</NativeSelectOption>
                ))}
            </NativeSelect>
            <NativeSelect
              aria-label="กรองสถานะ"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <NativeSelectOption value="">ทุกสถานะ</NativeSelectOption>
              <NativeSelectOption value="ready">พร้อมใช้งาน</NativeSelectOption>
              <NativeSelectOption value="low">สต๊อกต่ำ</NativeSelectOption>
            </NativeSelect>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสสินค้า</TableHead>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>
                  <span className="sr-only">แก้ไข</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category || "—"}</TableCell>
                  <TableCell className="text-right">
                    {p.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.quantity <= p.minimum ? "destructive" : "secondary"
                      }
                    >
                      {p.quantity <= p.minimum ? "สต๊อกต่ำ" : "พร้อมใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`แก้ไข ${p.name}`}
                      onClick={() => {
                        setError("");
                        setEditing(p);
                      }}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!visible.length && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Box />
                </EmptyMedia>
                <EmptyTitle>
                  {products.length
                    ? "ไม่พบสินค้าที่ค้นหา"
                    : "คลังสินค้าของคุณพร้อมแล้ว"}
                </EmptyTitle>
                <EmptyDescription>
                  {products.length
                    ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองอีกครั้ง"
                    : "เริ่มเพิ่มสินค้ารายการแรก เพื่อจัดการสต๊อกอย่างเป็นระบบ"}
                </EmptyDescription>
              </EmptyHeader>
              {!products.length && (
                <EmptyContent>
                  <Button onClick={() => setEditing("new")}>
                    <Plus data-icon="inline-start" />
                    เพิ่มสินค้ารายการแรก
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}
        </CardContent>
        <CardFooter>
          แสดง {visible.length} จาก {products.length} รายการ
        </CardFooter>
      </Card>
      {editing && (
        <Modal
          title={product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
          onClose={close}
        >
          <DialogDescription>
            กรอกรายละเอียดสินค้าเพื่อบันทึกเข้าคลัง
          </DialogDescription>
          <form onSubmit={save}>
            <FieldGroup>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sku">รหัสสินค้า *</FieldLabel>
                  <Input
                    id="sku"
                    name="sku"
                    required
                    maxLength={160}
                    defaultValue={product?.sku}
                    placeholder="ระบุรหัสสินค้า"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-name">ชื่อสินค้า *</FieldLabel>
                  <Input
                    id="product-name"
                    name="name"
                    required
                    maxLength={160}
                    defaultValue={product?.name}
                    placeholder="ระบุชื่อสินค้า"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category">หมวดหมู่</FieldLabel>
                  <Input
                    id="category"
                    name="category"
                    maxLength={160}
                    defaultValue={product?.category}
                    placeholder="ระบุหมวดหมู่"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="unit">หน่วย *</FieldLabel>
                  <Input
                    id="unit"
                    name="unit"
                    required
                    maxLength={160}
                    defaultValue={product?.unit}
                    placeholder="เช่น ชิ้น, กล่อง"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="quantity">จำนวนคงเหลือ *</FieldLabel>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    name="quantity"
                    required
                    defaultValue={product?.quantity ?? 0}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="minimum">
                    แจ้งเตือนเมื่อเหลือไม่เกิน
                  </FieldLabel>
                  <Input
                    id="minimum"
                    type="number"
                    min="0"
                    step="1"
                    name="minimum"
                    required
                    defaultValue={product?.minimum ?? 0}
                  />
                </Field>
              </FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field orientation="horizontal" className="justify-end">
                <Button type="button" variant="outline" onClick={close}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "บันทึกสินค้า"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Modal>
      )}
      {exporting && (
        <Modal title="ส่งออกสต๊อกสินค้า" onClose={close}>
          <DialogDescription>
            ส่งออกรายการสินค้าทั้งหมดเป็นไฟล์ Excel (.xlsx)
            ชื่อของคุณจะถูกบันทึกกำกับไว้ในรายงาน
          </DialogDescription>
          <form onSubmit={exportExcel}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="export-name">ชื่อผู้ส่งออก *</FieldLabel>
                <Input
                  id="export-name"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="กรอกชื่อ–นามสกุลของคุณ"
                  autoFocus
                />
              </Field>
              <Alert>
                <Download />
                <AlertDescription>
                  สินค้าทั้งหมด {products.length} รายการ
                </AlertDescription>
              </Alert>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field orientation="horizontal" className="justify-end">
                <Button type="button" variant="outline" onClick={close}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy}>
                  <Download data-icon="inline-start" />
                  {busy ? "กำลังส่งออก…" : "ดาวน์โหลด Excel"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Modal>
      )}
    </>
  );
}
