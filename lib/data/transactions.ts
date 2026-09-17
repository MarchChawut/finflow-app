import "server-only";
import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const TRANSACTIONS_PAGE_SIZE = 50;

// Shared by the initial server-rendered page (getInitialTransactionsPage,
// below) and the "load more" Server Action (lib/actions/transactions.ts) so
// the query never drifts between the two. Fetches one extra row to know if
// there's a next page without a separate count query. familyId is passed in
// explicitly since this fn is also called from the Server Action, which does
// its own verifySession() and shouldn't need a second one here.
export async function fetchTransactionsPage(familyId: string, offset: number) {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.familyId, familyId),
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
  return fetchTransactionsPage(user.familyId, 0);
});

export const getRecentTransactions = cache(async (limit = 5) => {
  const user = await verifySession();
  return db.query.transactions.findMany({
    where: eq(transactions.familyId, user.familyId),
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
