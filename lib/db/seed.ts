// Phase 7a (partial): sample categories/transactions/savingsGoals ported
// from docs/mockup.html's `state` object, so the dashboard has something to
// show before any real LINE/OCR data exists. Deliberately seeds no
// users/accounts — those only come from real Google sign-in (Phase 1).
//
// Run with: pnpm db:seed
//
// This script builds its own connection rather than importing `./index`,
// because that module has `import "server-only"` at the top — a marker
// package Next.js's bundler special-cases (no-op on the server, error in a
// client bundle). Run directly under plain Node via `tsx` (not through
// Next's build), `server-only` just unconditionally throws.
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { categories, transactions, savingsGoals } from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Categories already exist — skipping seed (already seeded).");
    process.exit(0);
  }

  const [salary, food, transport, shopping] = await db
    .insert(categories)
    .values([
      { name: "เงินเดือน & โบนัส", type: "INCOME", color: "#34D399", icon: "fa-money-bill-wave" },
      { name: "อาหาร & เครื่องดื่ม", type: "EXPENSE", color: "#A78BFA", icon: "fa-utensils" },
      { name: "เดินทาง & น้ำมัน", type: "EXPENSE", color: "#7DD3FC", icon: "fa-car" },
      { name: "ช้อปปิ้ง & ความบันเทิง", type: "EXPENSE", color: "#F9A8D4", icon: "fa-bag-shopping" },
    ])
    .returning();

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  await db.insert(transactions).values([
    {
      title: "เงินเดือนประจำเดือน",
      amount: "45000.00",
      type: "INCOME",
      channel: "LINE_CHAT",
      categoryId: salary.id,
      occurredAt: daysAgo(5),
    },
    {
      title: "สแกนสลิป ค่ามื้อเย็นสเต๊ก",
      amount: "850.00",
      type: "EXPENSE",
      channel: "LINE_CHAT",
      categoryId: food.id,
      occurredAt: daysAgo(4),
    },
    {
      title: "เติมน้ำมัน ปตท.",
      amount: "1200.00",
      type: "EXPENSE",
      channel: "LIFF_FORM",
      categoryId: transport.id,
      occurredAt: daysAgo(3),
    },
    {
      title: "ซื้อของเข้าบ้าน Uniqlo",
      amount: "2450.00",
      type: "EXPENSE",
      channel: "LINE_CHAT",
      categoryId: shopping.id,
      occurredAt: daysAgo(2),
    },
    {
      title: "รับเงินโอนค่าสอนพิเศษ",
      amount: "5000.00",
      type: "INCOME",
      channel: "LINE_CHAT",
      categoryId: salary.id,
      occurredAt: daysAgo(1),
    },
  ]);

  await db.insert(savingsGoals).values([
    { title: "ออมเงินเที่ยวญี่ปุ่น 🇯🇵", targetAmount: "50000.00", currentAmount: "35000.00", color: "purple" },
    { title: "กองทุนสำรองฉุกเฉิน 🛡️", targetAmount: "100000.00", currentAmount: "75000.00", color: "emerald" },
    { title: "ซื้อ iPad Pro ใหม่ 📱", targetAmount: "38000.00", currentAmount: "18000.00", color: "pink" },
  ]);

  console.log("Seeded 4 categories, 5 transactions, 3 savings goals.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
