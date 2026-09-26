import "server-only";
import { cache } from "react";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions, users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { isSoloFamily } from "@/lib/db/family";

export type PayPeriodSummary = {
  periodStart: Date | null;
  periodIncome: number;
  periodSpending: number;
  leftover: number;
};

// Shared by computePayPeriodSummary and computeFamilyCategoryBreakdown: both
// need "which rows count as this user's own, and from what point in time."
async function getUserPeriodWindow(userId: string, familyId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { salaryReceivedAt: true },
  });
  const periodStart = dbUser?.salaryReceivedAt ?? null;

  // Per-user (createdById), NOT visibleTo(): visibleTo() intentionally pools
  // in other family members' FAMILY-visibility rows, which is correct for
  // the dashboard's family-wide totalBalance but wrong here — this number
  // answers "did *this person's* salary cover *their* spending," so another
  // member's transactions must never be folded in, even FAMILY-visible ones.
  //
  // Exception: in a solo family, a FAMILY-visibility row with no
  // createdById (a historical transaction recorded before the LINE-binding
  // requirement existed) can only ever be this one person's — there's no
  // other member it could ambiguously belong to — so it's folded in too.
  // In a multi-person family such a row stays excluded from everyone, since
  // guessing which member it belongs to isn't safe.
  const solo = await isSoloFamily(familyId);
  const ownership = solo
    ? or(eq(transactions.createdById, userId), and(eq(transactions.visibility, "FAMILY"), isNull(transactions.createdById)))
    : eq(transactions.createdById, userId);

  // Truncated to start-of-day in Asia/Bangkok, explicitly — the existing
  // monthRange() previously used in lib/data/dashboard.ts relied on
  // server-local time, which is ambiguous on a UTC host; this avoids that.
  // Falls back to the epoch when no marker has been set yet, so
  // period-scoped sums are simply "all-time" until the first mark.
  const periodStartFloor = periodStart
    ? sql`date_trunc('day', ${periodStart}::timestamptz AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'`
    : sql`'epoch'::timestamptz`;

  return { periodStart, ownership, periodStartFloor };
}

// Uncached on purpose: called both from the dashboard render AND from
// clearPeriodBalanceToSavings (lib/actions/payPeriod.ts), which runs as its
// own separate server-action request right after markSalaryReceived() may
// have just written a new salaryReceivedAt — a cache() wrapper here could
// serve a stale periodStart across those two call sites.
export async function computePayPeriodSummary(
  userId: string,
  familyId: string,
): Promise<PayPeriodSummary> {
  const { periodStart, ownership, periodStartFloor } = await getUserPeriodWindow(userId, familyId);

  const [row] = await db
    .select({
      // "leftover" is deliberately ALL-TIME, unbounded by periodStart: it's
      // how much of this person's own money is currently sitting unswept,
      // and it must not reset just because "เงินเดือนเข้าวันนี้" was pressed —
      // otherwise whatever was sitting around before that click becomes
      // permanently invisible to the clear-to-savings button.
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      spending: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.isSavingsSweep} = false then ${transactions.amount} else 0 end), 0)`,
      swept: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.isSavingsSweep} = true then ${transactions.amount} else 0 end), 0)`,
      // These two ARE bounded by periodStart — they answer "did this
      // period's income cover this period's spending," a separate question
      // from "how much unswept cash is there right now."
      periodIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.occurredAt} >= ${periodStartFloor} then ${transactions.amount} else 0 end), 0)`,
      periodSpending: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.isSavingsSweep} = false and ${transactions.occurredAt} >= ${periodStartFloor} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.familyId, familyId), ownership));

  const allTimeIncome = Number(row.income);
  const allTimeSpending = Number(row.spending);
  const allTimeSwept = Number(row.swept);

  return {
    periodStart,
    periodIncome: Number(row.periodIncome),
    periodSpending: Number(row.periodSpending),
    leftover: allTimeIncome - allTimeSpending - allTimeSwept,
  };
}

export const getPayPeriodSummary = cache(async () => {
  const user = await verifySession();
  return computePayPeriodSummary(user.id, user.familyId);
});

// Family-wide "this period" totals for the dashboard's top metric cards and
// bar chart — each member's own pay-period window (since their own
// salaryReceivedAt, or all-time if never marked) summed together, so a
// multi-person family's numbers reflect "since each person's own payday,"
// never one shared calendar boundary that mixes everyone's different
// paydays back together (the exact problem this whole feature exists for).
// Reuses computePayPeriodSummary per member rather than a new correlated
// query — more DB round trips, but no new place for the per-user logic to
// drift out of sync with PayPeriodCard's own numbers.
export async function computeFamilyPeriodTotals(familyId: string) {
  const members = await db.query.users.findMany({
    where: eq(users.familyId, familyId),
    columns: { id: true },
  });
  const summaries = await Promise.all(
    members.map((member) => computePayPeriodSummary(member.id, familyId)),
  );
  return summaries.reduce(
    (acc, s) => ({
      periodIncome: acc.periodIncome + s.periodIncome,
      periodSpending: acc.periodSpending + s.periodSpending,
    }),
    { periodIncome: 0, periodSpending: 0 },
  );
}

export type CategoryBreakdownRow = {
  categoryId: string;
  name: string;
  color: string | null;
  total: number;
};

// "หมวดหมู่รายจ่ายสูงสุด" — same per-member-window reasoning as
// computeFamilyPeriodTotals, but grouped by category. Each member's own
// spending is only counted from their own period start, then merged across
// members (a shared FAMILY category two people both spent from needs its
// amounts summed together, not reported as two separate rows).
export async function computeFamilyCategoryBreakdown(
  familyId: string,
): Promise<CategoryBreakdownRow[]> {
  const members = await db.query.users.findMany({
    where: eq(users.familyId, familyId),
    columns: { id: true },
  });

  const perMemberRows = await Promise.all(
    members.map(async (member) => {
      const { ownership, periodStartFloor } = await getUserPeriodWindow(member.id, familyId);
      // No isSavingsSweep filter needed — a sweep transaction has no
      // categoryId, so this INNER JOIN already drops it, same as the
      // calendar-month version of this query did before it.
      return db
        .select({
          categoryId: categories.id,
          name: categories.name,
          color: categories.color,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.familyId, familyId),
            ownership,
            eq(transactions.type, "EXPENSE"),
            sql`${transactions.occurredAt} >= ${periodStartFloor}`,
          ),
        )
        .groupBy(categories.id, categories.name, categories.color);
    }),
  );

  const merged = new Map<string, CategoryBreakdownRow>();
  for (const rows of perMemberRows) {
    for (const row of rows) {
      const existing = merged.get(row.categoryId);
      const total = Number(row.total);
      if (existing) {
        existing.total += total;
      } else {
        merged.set(row.categoryId, { categoryId: row.categoryId, name: row.name, color: row.color, total });
      }
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
