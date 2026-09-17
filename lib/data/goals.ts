import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const getGoals = cache(async () => {
  const user = await verifySession();
  return db.query.savingsGoals.findMany({
    where: eq(savingsGoals.familyId, user.familyId),
    orderBy: [asc(savingsGoals.createdAt)],
  });
});
