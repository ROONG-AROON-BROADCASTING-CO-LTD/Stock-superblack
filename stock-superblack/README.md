# SUPERBLACK Workspace

แดชบอร์ดภาษาไทยสำหรับสต๊อกสินค้า ลงเวลาเข้า–ออกงาน และบันทึกการลา พัฒนาด้วย Next.js, React, TypeScript และ Bun

หน้าจอใช้ components ทางการจาก shadcn/ui รูปแบบ Base Nova ได้แก่ Sidebar, Sheet, Card, Table, Dialog, Field, Input, Native Select, Textarea, Tabs, Badge, Avatar, Empty, Alert และ Sonner ใช้ Tailwind utilities จัด layout และ responsive โดย `app/globals.css` มีเฉพาะ imports, theme tokens และ base layer ของ shadcn ไม่มี custom CSS สำหรับหน้าจอ

## เริ่มใช้งาน

รันจากโฟลเดอร์ที่มี `package.json` และ `bun.lock`:

```bash
cd /Users/pachara/Documents/GitHub/Stock-superblack/stock-superblack
bun install --frozen-lockfile
bun run dev
```

เปิด http://localhost:3000 โดยใช้ username/password ที่กำหนดใน `.env` ผ่าน `AUTH_USERNAME` และ `AUTH_PASSWORD` ไฟล์นี้ถูกยกเว้นจาก Git และใช้เฉพาะฝั่งเซิร์ฟเวอร์ ให้สร้างไฟล์นี้เองเมื่อ clone ไปเครื่องใหม่

```bash
bun run lint
bun run build
bun run start
```

## การใช้งาน

- `/`: เพิ่มและแก้ไขสินค้า ค้นหาตามชื่อ/รหัส กรองหมวดหมู่/สถานะ และดูสินค้าที่เหลือไม่เกินจำนวนขั้นต่ำ
- ส่งออก Excel `.xlsx` ของสินค้าทั้งหมด โดยต้องระบุชื่อผู้ส่งออกทุกครั้ง รายงานมีชื่อ วันเวลาส่งออก และข้อมูลสินค้าที่บันทึกจริง
- `/attendance`: เช็คอิน เช็คเอ้าท์ ดูประวัติและระยะเวลาทำงาน รวมถึงบันทึกลากิจ ลาป่วย ลาพักร้อน และลาอื่นๆ พร้อมวันที่และเหตุผล
- แสดงชื่อผู้ใช้งานจากบัญชีที่เข้าสู่ระบบ เวลาใช้เขต Asia/Bangkok
- รองรับจอมือถือด้วย sidebar แบบพับและตารางที่เลื่อนแนวนอนได้

## การเก็บข้อมูล

เริ่มต้นโดยไม่มีข้อมูลสินค้า ประวัติลงเวลา หรือวันลา ข้อมูลที่กรอกจะถูกบันทึกฝั่งเซิร์ฟเวอร์ลง `.data/database.json` และยังอยู่หลังรีเฟรชหรือรีสตาร์ตเซิร์ฟเวอร์ ไฟล์ข้อมูลถูกยกเว้นจาก Git ควรสำรองโฟลเดอร์ `.data` เมื่อต้องการเก็บข้อมูล

เวอร์ชันนี้เหมาะกับการรันในเครื่องหรือเซิร์ฟเวอร์เดียวที่มีดิสก์ถาวร หากนำไปใช้กับ serverless หรือหลาย instance ต้องเปลี่ยนส่วนเก็บข้อมูลเป็นฐานข้อมูลถาวร การลาเป็นการบันทึกประวัติ ยังไม่มีขั้นตอนอนุมัติหรือคำนวณสิทธิลาคงเหลือ

## โครงสร้าง

```text
app/                       หน้าจอและ API routes
  api/auth/                เข้าสู่ระบบและออกจากระบบ
  api/workspace/           อ่านและบันทึกข้อมูล
  api/inventory/export/    สร้างรายงาน Excel
  attendance/              หน้าลงเวลาและการลา
components/dashboard/      โครงแดชบอร์ดและ dialog
components/inventory/      หน้าสต๊อกสินค้า
components/attendance/     หน้าลงเวลาและการลา
components/ui/             components ทางการจาก shadcn/ui
hooks/use-mobile.ts        ตรวจขนาดจอสำหรับ Sidebar
lib/server/                session และการเก็บข้อมูลบนเซิร์ฟเวอร์
lib/api-client.ts          ตัวเรียก API ฝั่ง client
lib/types.ts               ชนิดข้อมูลที่ใช้ร่วมกัน
```
