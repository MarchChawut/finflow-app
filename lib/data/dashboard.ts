import "server-only";
import { cache } from "react";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, savingsGoals, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export const getDashboardSummary = cache(async () => {
  const user = await verifySession();
  const { start, end } = monthRange();
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

  const [[totals], [monthTotals], [savings], categoryBreakdown, recentTransactions] =
    await Promise.all([
      db
        .select({
          totalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
          totalExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(txVisible),

      db
        .select({
          monthIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
          monthExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(and(txVisible, gte(transactions.occurredAt, start), lt(transactions.occurredAt, end))),

      db
        .select({
          totalSavings: sql<string>`coalesce(sum(${savingsGoals.currentAmount}), 0)`,
        })
        .from(savingsGoals)
        .where(goalsVisible),

      db
        .select({
          categoryId: categories.id,
          name: categories.name,
          color: categories.color,
          total: sql<string>`sum(${transactions.amount})`,
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            txVisible,
            eq(transactions.type, "EXPENSE"),
            gte(transactions.occurredAt, start),
            lt(transactions.occurredAt, end),
          ),
        )
        .groupBy(categories.id, categories.name, categories.color)
        .orderBy(desc(sql`sum(${transactions.amount})`))
        .limit(5),

      db.query.transactions.findMany({
        where: txVisible,
        with: { category: true },
        orderBy: [desc(transactions.occurredAt)],
        limit: 5,
      }),
    ]);

  return {
    totalBalance: Number(totals.totalIncome) - Number(totals.totalExpense),
    monthIncome: Number(monthTotals.monthIncome),
    monthExpense: Number(monthTotals.monthExpense),
    totalSavings: Number(savings.totalSavings),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      ...c,
      total: Number(c.total),
    })),
    recentTransactions,
  };
});
