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

// Admin-gated, same reasoning as updateUserRole. Nulls familyId rather than
// deleting the users row — transactions/goals/bills reference createdById
// with no cascade, so a hard delete would hit a Postgres FK-restrict error
// the moment a removed member has any history. A null familyId is also
// exactly what auth.ts's jwt callback already treats as "needs a family":
// the removed member's next sign-in transparently gives them a brand-new
// family of their own, rather than leaving them in a broken state.
export async function removeFamilyMember(userId: string) {
  const user = await verifySession();
  if (user.role !== "ADMIN") return;
  if (userId === user.id) return;
  await db
    .update(users)
    .set({ familyId: null })
    .where(and(eq(users.id, userId), eq(users.familyId, user.familyId)));
  revalidatePath("/family");
}
