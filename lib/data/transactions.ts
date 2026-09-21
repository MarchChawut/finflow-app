import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";

export const TRANSACTIONS_PAGE_SIZE = 50;

export type TransactionTab = "personal" | "family";

// "ส่วนตัว" tab = only my own PERSONAL rows; "ครอบครัว" tab = only FAMILY
// rows (matches the pre-existing family-wide behavior). Unlike `visibleTo`
// (used for aggregates that must include both), a tab is an exclusive view.
function tabCondition(tab: TransactionTab, userId: string) {
  return tab === "personal"
    ? and(eq(transactions.visibility, "PERSONAL"), eq(transactions.createdById, userId))
    : eq(transactions.visibility, "FAMILY");
}

// Shared by the initial server-rendered page (getInitialTransactionsPage,
// below) and the "load more" Server Action (lib/actions/transactions.ts) so
// the query never drifts between the two. Fetches one extra row to know if
// there's a next page without a separate count query. familyId/userId are
// passed in explicitly since this fn is also called from the Server Action,
// which does its own verifySession() and shouldn't need a second one here.
export async function fetchTransactionsPage(
  familyId: string,
  offset: number,
  userId: string,
  tab: TransactionTab,
) {
  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.familyId, familyId), tabCondition(tab, userId)),
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
    limit: TRANSACTIONS_PAGE_SIZE + 1,
    offset,
  });
  const hasMore = rows.length > TRANSACTIONS_PAGE_SIZE;
  return { transactions: rows.slice(0, TRANSACTIONS_PAGE_SIZE), hasMore };
}

export const getInitialTransactionsPage = cache(async (tab: TransactionTab = "family") => {
  const user = await verifySession();
  return fetchTransactionsPage(user.familyId, 0, user.id, tab);
});

// Used by the dashboard/AI-coach context, not a tab view — includes every
// row this user may see (FAMILY ∪ their own PERSONAL), never someone else's
// personal rows.
export const getRecentTransactions = cache(async (limit = 5) => {
  const user = await verifySession();
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.familyId, user.familyId),
      visibleTo(transactions.visibility, transactions.createdById, user.id),
    ),
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
    limit,
  });
});

export const getCategories = cache(async () => {
  const user = await verifySession();
  return db.query.categories.findMany({
    where: eq(categories.familyId, user.familyId),
  });
});
