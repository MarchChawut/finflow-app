"use server";

import * as z from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { savingsGoals } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";

const GoalSchema = z.object({
  title: z.string().trim().min(1, { error: "กรุณาระบุชื่อเป้าหมาย" }),
  targetAmount: z.coerce.number().positive({ error: "เป้าหมายต้องมากกว่า 0" }),
  color: z.string().trim().optional(),
  visibility: z.enum(["PERSONAL", "FAMILY"]).default("FAMILY"),
  // Only set from the edit flow (GoalModal.tsx only renders this field when
  // editing) — lets a wrong contribution (by hand or from the LINE savings-
  // transfer feature) be corrected, or a goal reset back to 0 to start over.
  currentAmount: z.coerce
    .number()
    .min(0, { error: "ยอดออมต้องไม่ติดลบ" })
    .optional(),
});

export type GoalFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

// Scopes a mutation to a goal this caller may actually touch: same family,
// and (FAMILY-visibility OR owned by the caller). Shared by every mutation
// below so the rule can't drift between them.
function ownedGoal(id: string, familyId: string, userId: string) {
  return and(
    eq(savingsGoals.id, id),
    eq(savingsGoals.familyId, familyId),
    visibleTo(savingsGoals.visibility, savingsGoals.createdById, userId),
  );
}

export async function createGoal(
  _prevState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const user = await verifySession();

  const validated = GoalSchema.safeParse({
    title: formData.get("title"),
    targetAmount: formData.get("targetAmount"),
    color: formData.get("color"),
    visibility: formData.get("visibility") || undefined,
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { title, targetAmount, color, visibility } = validated.data;

  await db.insert(savingsGoals).values({
    title,
    targetAmount: targetAmount.toFixed(2),
    color: color || null,
    createdById: user.id,
    familyId: user.familyId,
    visibility,
  });

  revalidatePath("/goals");
  return { success: true };
}

export async function updateGoal(
  id: string,
  _prevState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const user = await verifySession();

  const validated = GoalSchema.safeParse({
    title: formData.get("title"),
    targetAmount: formData.get("targetAmount"),
    color: formData.get("color"),
    visibility: formData.get("visibility") || undefined,
    currentAmount: formData.get("currentAmount") || undefined,
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { title, targetAmount, color, visibility, currentAmount } = validated.data;

  await db
    .update(savingsGoals)
    .set({
      title,
      targetAmount: targetAmount.toFixed(2),
      color: color || null,
      visibility,
      ...(currentAmount !== undefined ? { currentAmount: currentAmount.toFixed(2) } : {}),
    })
    .where(ownedGoal(id, user.familyId, user.id));

  revalidatePath("/goals");
  return { success: true };
}

export async function deleteGoal(id: string) {
  const user = await verifySession();
  await db.delete(savingsGoals).where(ownedGoal(id, user.familyId, user.id));
  revalidatePath("/goals");
}

export async function contributeToGoal(id: string, formData: FormData) {
  const user = await verifySession();
  const amount = Number(formData.get("amount"));
  if (!(amount > 0)) return;

  await db
    .update(savingsGoals)
    .set({ currentAmount: sql`${savingsGoals.currentAmount} + ${amount.toFixed(2)}` })
    .where(ownedGoal(id, user.familyId, user.id));

  revalidatePath("/goals");
}
