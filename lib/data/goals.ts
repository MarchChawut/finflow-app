import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";

export const getGoals = cache(async () => {
  const user = await verifySession();
  return db.query.savingsGoals.findMany({
    where: and(
      eq(savingsGoals.familyId, user.familyId),
      visibleTo(savingsGoals.visibility, savingsGoals.createdById, user.id),
    ),
    orderBy: [asc(savingsGoals.createdAt)],
    with: { allocations: { orderBy: (a, { asc }) => [asc(a.sortOrder), asc(a.createdAt)] } },
  });
});
