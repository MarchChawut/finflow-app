import "server-only";
import { cache } from "react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";
import { computeFamilyCategoryBreakdown, computeFamilyPeriodTotals } from "@/lib/data/payPeriod";

export const getDashboardSummary = cache(async () => {
  const user = await verifySession();
  // Every aggregate below must only ever count what this specific user may
  // see (FAMILY rows ∪ their own PERSONAL rows) — never another member's
  // personal wallets/transactions, even folded into a sum.
  const txVisible = and(
    eq(transactions.familyId, user.familyId),
    visibleTo(transactions.visibility, transactions.createdById, user.id),
  );
  const goalsVisible = and(
    eq(savingsGoals.familyId, user.familyId),
    visibleTo(savingsGoals.visibility, savingsGoals.createdById, user.id),
  );

  const [[totals], periodTotals, [savings], categoryBreakdown, recentTransactions] =
    await Promise.all([
      db
        .select({
          totalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
          totalExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(txVisible),

      // "รายรับ/รายจ่ายเดือนนี้" — deliberately NOT a calendar-month query:
      // each family member has their own payday, so this sums every
      // member's own since-their-own-last-payday window (computed by
      // computePayPeriodSummary, same as PayPeriodCard) rather than mixing
      // everyone into one shared calendar boundary. Resets to ~0 whenever a
      // member marks salary or clears their leftover to savings.
      computeFamilyPeriodTotals(user.familyId),

      db
        .select({
          totalSavings: sql<string>`coalesce(sum(${savingsGoals.currentAmount}), 0)`,
        })
        .from(savingsGoals)
        .where(goalsVisible),

      // "หมวดหมู่รายจ่ายสูงสุด" — same since-each-member's-own-payday reasoning
      // as computeFamilyPeriodTotals above, not a calendar-month query.
      computeFamilyCategoryBreakdown(user.familyId),

      db.query.transactions.findMany({
        where: txVisible,
        with: { category: true },
        orderBy: [desc(transactions.occurredAt)],
        limit: 5,
      }),
    ]);

  return {
    totalBalance: Number(totals.totalIncome) - Number(totals.totalExpense),
    monthIncome: periodTotals.periodIncome,
    monthExpense: periodTotals.periodSpending,
    totalSavings: Number(savings.totalSavings),
    categoryBreakdown,
    recentTransactions,
  };
});
