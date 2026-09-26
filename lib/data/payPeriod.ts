import "server-only";
import { cache } from "react";
import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
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

// Shared by computePayPeriodSummary and computeCategoryBreakdown: both need
// "which rows count as this user's own, and from what point in time."
async function getUserPeriodWindow(userId: string, familyId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { salaryReceivedAt: true, lineUserId: true },
  });
  const periodStart = dbUser?.salaryReceivedAt ?? null;

  // Per-user (createdById), NOT visibleTo(): visibleTo() intentionally pools
  // in other family members' FAMILY-visibility rows, which is correct for
  // the dashboard's family-wide totalBalance but wrong here — this number
  // answers "did *this person's* salary cover *their* spending," so another
  // member's transactions must never be folded in, even FAMILY-visible ones.
  //
  // A row can be missing createdById for two reasons, both predating the
  // LINE-binding requirement (every current insert path sets createdById
  // unconditionally): 1) solo family — there's no one else it could belong
  // to, so any orphaned FAMILY row is unambiguously this one person's; or
  // 2) its lineUserId matches this user's own bound lineUserId — since
  // users.lineUserId is unique per family, that match is unambiguous
  // regardless of family size, and is strictly more precise than the
  // solo-family case (this catches the same rows there too when they happen
  // to carry a lineUserId, so it's additive, not a replacement).
  const orphanedFamilyRow = and(
    eq(transactions.visibility, "FAMILY"),
    isNull(transactions.createdById),
  ) as SQL;
  const ownershipConditions: SQL[] = [eq(transactions.createdById, userId)];
  const solo = await isSoloFamily(familyId);
  if (solo) {
    ownershipConditions.push(orphanedFamilyRow);
  } else if (dbUser?.lineUserId) {
    ownershipConditions.push(and(orphanedFamilyRow, eq(transactions.lineUserId, dbUser.lineUserId)) as SQL);
  }
  const ownership = or(...ownershipConditions) as SQL;

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

export type CategoryBreakdownRow = {
  categoryId: string;
  name: string;
  color: string | null;
  total: number;
};

// "หมวดหมู่รายจ่ายสูงสุด" — this user's own spending only (never another
// family member's, even FAMILY-visibility categories they also used),
// scoped to their own pay-period window, same reasoning as
// computePayPeriodSummary.
export async function computeCategoryBreakdown(
  userId: string,
  familyId: string,
): Promise<CategoryBreakdownRow[]> {
  const { ownership, periodStartFloor } = await getUserPeriodWindow(userId, familyId);

  // No isSavingsSweep filter needed — a sweep transaction has no
  // categoryId, so this INNER JOIN already drops it.
  const rows = await db
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
    .groupBy(categories.id, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`))
    .limit(5);

  return rows.map((row) => ({ ...row, total: Number(row.total) }));
}
