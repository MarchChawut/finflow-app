"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

// Admin-gated: changing roles is a privilege-escalation-sensitive action
// (including self-promotion) — a real admin already exists in this
// deployment, so gating no longer risks locking everyone out the way it
// would have when no one held the ADMIN role yet.
export async function updateUserRole(userId: string, role: "ADMIN" | "MEMBER") {
  const user = await verifySession();
  if (user.role !== "ADMIN") return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/family");
}
