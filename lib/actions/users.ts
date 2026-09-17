"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

// Admin-gated: changing roles is a privilege-escalation-sensitive action
// (including self-promotion) — a real admin already exists in this
// deployment, so gating no longer risks locking everyone out the way it
// would have when no one held the ADMIN role yet.
//
// Also scoped to the caller's own family: without the familyId check, an
// admin of one family could target a userId belonging to a *different*
// family (multi-tenant since Phase 1) — the `and(...)` makes the update
// match zero rows (silent no-op) if the target isn't in the caller's family,
// same pattern as markRecurringBillPaid's idempotency guard.
export async function updateUserRole(userId: string, role: "ADMIN" | "MEMBER") {
  const user = await verifySession();
  if (user.role !== "ADMIN") return;
  await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, userId), eq(users.familyId, user.familyId)));
  revalidatePath("/family");
}
