import "server-only";
import { cache } from "react";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, savingsGoals, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export const getDashboardSummary = cache(async () => {
  const user = await verifySession();
  const { start, end } = monthRange();
  const familyId = eq(transactions.familyId, user.familyId);

  const [[totals], [monthTotals], [savings], categoryBreakdown, recentTransactions] =
    await Promise.all([
      db
        .select({
          totalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
          totalExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(familyId),

      db
        .select({
          monthIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
          monthExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(and(familyId, gte(transactions.occurredAt, start), lt(transactions.occurredAt, end))),

      db
        .select({
          totalSavings: sql<string>`coalesce(sum(${savingsGoals.currentAmount}), 0)`,
        })
        .from(savingsGoals)
        .where(eq(savingsGoals.familyId, user.familyId)),

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
            familyId,
            eq(transactions.type, "EXPENSE"),
            gte(transactions.occurredAt, start),
            lt(transactions.occurredAt, end),
          ),
        )
        .groupBy(categories.id, categories.name, categories.color)
        .orderBy(desc(sql`sum(${transactions.amount})`))
        .limit(5),

      db.query.transactions.findMany({
        where: familyId,
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
