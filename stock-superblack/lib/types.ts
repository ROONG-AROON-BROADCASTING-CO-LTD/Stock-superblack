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
};
export type Database = {
  products: Product[];
  attendance: Attendance[];
  leaves: Leave[];
};
