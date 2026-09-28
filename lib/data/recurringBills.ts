import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringBills, users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

// The moment a bill's lastPaidAt must be on/after to still count as "paid" —
// the viewer's own pay-period start, not the calendar month. Uses the exact
// salaryReceivedAt timestamp (unlike payPeriod.ts's day-floor periodStartFloor):
// a bill paid earlier today must stay paid even if the user clears their
// balance later the same day, so no day-level rounding here.
export async function getBillPeriodStart(userId: string): Promise<Date> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { salaryReceivedAt: true },
  });
  if (dbUser?.salaryReceivedAt) return new Date(dbUser.salaryReceivedAt);
  // No pay period started yet — fall back to the old calendar-month behavior.
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Personal, like every other feature except savingsGoals ("กระเป๋า") — each
// family member manages their own recurring bills, never shared.
export const getRecurringBills = cache(async () => {
  const user = await verifySession();
  const bills = await db.query.recurringBills.findMany({
    where: and(eq(recurringBills.familyId, user.familyId), eq(recurringBills.createdById, user.id)),
    orderBy: [asc(recurringBills.createdAt)],
  });

  const periodStart = await getBillPeriodStart(user.id);

  return bills.map((bill) => ({
    ...bill,
    paidThisPeriod: bill.lastPaidAt ? new Date(bill.lastPaidAt) >= periodStart : false,
  }));
});
