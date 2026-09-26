import "server-only";
import { cache } from "react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";
import { computeCategoryBreakdown, computePayPeriodSummary } from "@/lib/data/payPeriod";

export const getDashboardSummary = cache(async () => {
  const user = await verifySession();
  // Transactions are always personal — every aggregate below is this user's
  // own only, never another family member's. Only savingsGoals ("กระเป๋า")
  // stays family-shared, via visibleTo(), so goalsVisible is the one
  // exception here.
  const txOwn = and(eq(transactions.familyId, user.familyId), eq(transactions.createdById, user.id));
  const goalsVisible = and(
    eq(savingsGoals.familyId, user.familyId),
    visibleTo(savingsGoals.visibility, savingsGoals.createdById, user.id),
  );

  const [payPeriod, [savings], categoryBreakdown, recentTransactions] = await Promise.all([
    // "เงินคงเหลือรวม" / "รายรับ-รายจ่ายเดือนนี้" — this user's own numbers
    // only (leftover is all-time, periodIncome/periodSpending since their
    // own last payday/clear), same computation PayPeriodCard already uses.
    computePayPeriodSummary(user.id, user.familyId),

    db
      .select({
        totalSavings: sql<string>`coalesce(sum(${savingsGoals.currentAmount}), 0)`,
      })
      .from(savingsGoals)
      .where(goalsVisible),

    // "หมวดหมู่รายจ่ายสูงสุด" — this user's own spending only.
    computeCategoryBreakdown(user.id, user.familyId),

    db.query.transactions.findMany({
      where: txOwn,
      with: { category: true },
      orderBy: [desc(transactions.occurredAt)],
      limit: 5,
    }),
  ]);

  return {
    totalBalance: payPeriod.leftover,
    monthIncome: payPeriod.periodIncome,
    monthExpense: payPeriod.periodSpending,
    totalSavings: Number(savings.totalSavings),
    categoryBreakdown,
    recentTransactions,
  };
});
