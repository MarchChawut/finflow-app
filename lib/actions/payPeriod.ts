"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { savingsGoals, transactions, users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";
import { computePayPeriodSummary } from "@/lib/data/payPeriod";

export async function markSalaryReceived() {
  const user = await verifySession();
  await db.update(users).set({ salaryReceivedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath("/");
  // Also flips recurring bills' paid-this-period status on /transactions.
  revalidatePath("/transactions");
}

export type ClearPeriodBalanceState = { message?: string; success?: boolean } | undefined;

export async function clearPeriodBalanceToSavings(
  _prevState: ClearPeriodBalanceState,
  formData: FormData,
): Promise<ClearPeriodBalanceState> {
  const user = await verifySession();
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { message: "กรุณาเลือกเป้าหมายเงินออม" };

  const goal = await db.query.savingsGoals.findFirst({
    where: and(
      eq(savingsGoals.id, goalId),
      eq(savingsGoals.familyId, user.familyId),
      visibleTo(savingsGoals.visibility, savingsGoals.createdById, user.id),
    ),
  });
  if (!goal) return { message: "ไม่พบเป้าหมายเงินออมนี้" };

  // Server recomputes the amount — never trust a client-supplied figure.
  const { leftover } = await computePayPeriodSummary(user.id, user.familyId);
  if (leftover <= 0) {
    return { message: "ยอดคงเหลือรอบนี้เป็น 0 หรือติดลบ ไม่มีอะไรให้เคลียร์" };
  }

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      title: `เคลียร์ยอดคงเหลือเข้า "${goal.title}"`,
      amount: leftover.toFixed(2),
      type: "EXPENSE",
      channel: "DASHBOARD",
      isSavingsSweep: true,
      createdById: user.id,
      familyId: user.familyId,
      // Mirrors the target goal's own visibility — a sweep into a PERSONAL
      // goal stays personal, same reasoning ownedGoal() uses for scoping.
      visibility: goal.visibility,
    });

    await tx
      .update(savingsGoals)
      .set({ currentAmount: sql`${savingsGoals.currentAmount} + ${leftover.toFixed(2)}` })
      .where(eq(savingsGoals.id, goal.id));

    // A successful clear also starts a fresh period — the user asked for
    // clearing itself to be "ready for a new month," not a separate step.
    // Only on this success path: refusing early above (nothing to clear)
    // must never silently reset someone's tracking window.
    await tx.update(users).set({ salaryReceivedAt: new Date() }).where(eq(users.id, user.id));
  });

  revalidatePath("/");
  revalidatePath("/goals");
  // Also flips recurring bills' paid-this-period status on /transactions.
  revalidatePath("/transactions");
  return { success: true };
}
