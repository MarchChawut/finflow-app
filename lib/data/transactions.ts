import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const TRANSACTIONS_PAGE_SIZE = 50;

// Transactions are always strictly personal — never shared with other
// family members (only savingsGoals/"กระเป๋า" has a FAMILY-shared view).
// Shared by the initial server-rendered page (getInitialTransactionsPage,
// below) and the "load more" Server Action (lib/actions/transactions.ts) so
// the query never drifts between the two. Fetches one extra row to know if
// there's a next page without a separate count query. familyId/userId are
// passed in explicitly since this fn is also called from the Server Action,
// which does its own verifySession() and shouldn't need a second one here.
export async function fetchTransactionsPage(familyId: string, offset: number, userId: string) {
  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.familyId, familyId), eq(transactions.createdById, userId)),
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
    limit: TRANSACTIONS_PAGE_SIZE + 1,
    offset,
  });
  const hasMore = rows.length > TRANSACTIONS_PAGE_SIZE;
  return { transactions: rows.slice(0, TRANSACTIONS_PAGE_SIZE), hasMore };
}

export const getInitialTransactionsPage = cache(async () => {
  const user = await verifySession();
  return fetchTransactionsPage(user.familyId, 0, user.id);
});

// Used by the dashboard/AI-coach context — this user's own rows only.
export const getRecentTransactions = cache(async (limit = 5) => {
  const user = await verifySession();
  return db.query.transactions.findMany({
    where: and(eq(transactions.familyId, user.familyId), eq(transactions.createdById, user.id)),
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
