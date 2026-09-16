import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const getGoals = cache(async () => {
  await verifySession();
  return db.query.savingsGoals.findMany({
    orderBy: [asc(savingsGoals.createdAt)],
  });
});
