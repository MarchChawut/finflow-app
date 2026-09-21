import { eq, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// Shared "can this user see/touch this row" condition for any table with a
// `visibility` (PERSONAL/FAMILY) + `createdById` column pair: FAMILY rows are
// visible/mutable by the whole family (pre-existing behavior); PERSONAL rows
// only by their creator. Combine with `and(eq(familyId, ...), visibleTo(...))`
// at every read and mutation site that touches savingsGoals or transactions.
export function visibleTo(visibilityCol: PgColumn, createdByCol: PgColumn, userId: string) {
  return or(eq(visibilityCol, "FAMILY"), eq(createdByCol, userId));
}
