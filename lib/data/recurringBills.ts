import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringBills } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const getRecurringBills = cache(async () => {
  await verifySession();
  const bills = await db.query.recurringBills.findMany({
    orderBy: [asc(recurringBills.createdAt)],
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return bills.map((bill) => ({
    ...bill,
    paidThisMonth: bill.lastPaidAt ? new Date(bill.lastPaidAt) >= startOfMonth : false,
  }));
});
