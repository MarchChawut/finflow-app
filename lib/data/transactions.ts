import "server-only";
import { cache } from "react";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const TRANSACTIONS_PAGE_SIZE = 50;

// Shared by the initial server-rendered page (getInitialTransactionsPage,
// below) and the "load more" Server Action (lib/actions/transactions.ts) so
// the query never drifts between the two. Fetches one extra row to know if
// there's a next page without a separate count query.
export async function fetchTransactionsPage(offset: number) {
  const rows = await db.query.transactions.findMany({
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
    limit: TRANSACTIONS_PAGE_SIZE + 1,
    offset,
  });
  const hasMore = rows.length > TRANSACTIONS_PAGE_SIZE;
  return { transactions: rows.slice(0, TRANSACTIONS_PAGE_SIZE), hasMore };
}

export const getInitialTransactionsPage = cache(async () => {
  await verifySession();
  return fetchTransactionsPage(0);
});

export const getRecentTransactions = cache(async (limit = 5) => {
  await verifySession();
  return db.query.transactions.findMany({
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
    limit,
  });
});

export const getCategories = cache(async () => {
  await verifySession();
  return db.query.categories.findMany();
});
