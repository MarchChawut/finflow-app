"use server";

import * as z from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { goalAllocations, savingsGoals } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { visibleTo } from "@/lib/db/visibility";

const AllocationSchema = z.object({
  label: z.string().trim().min(1, { error: "กรุณาระบุชื่อสัดส่วน" }),
  type: z.enum(["AMOUNT", "PERCENT"], { error: "กรุณาเลือกประเภท" }),
  value: z.coerce.number().positive({ error: "มูลค่าต้องมากกว่า 0" }),
});

export type AllocationFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

// Every mutation scopes itself to a goal in the caller's family AND
// (FAMILY-visibility OR owned by the caller) — same rule as goals.ts, since
// goal_allocations carries no familyId/visibility/createdById of its own.
function accessibleGoalIds(familyId: string, userId: string) {
  return db
    .select({ id: savingsGoals.id })
    .from(savingsGoals)
    .where(
      and(
        eq(savingsGoals.familyId, familyId),
        visibleTo(savingsGoals.visibility, savingsGoals.createdById, userId),
      ),
    );
}

// createAllocation has no existing row for a WHERE to scope against (it's an
// INSERT), so unlike update/delete below it still needs an explicit
// check-then-act SELECT before writing.
async function findAccessibleGoal(goalId: string, familyId: string, userId: string) {
  return db.query.savingsGoals.findFirst({
    where: and(
      eq(savingsGoals.id, goalId),
      eq(savingsGoals.familyId, familyId),
      visibleTo(savingsGoals.visibility, savingsGoals.createdById, userId),
    ),
    columns: { id: true },
  });
}

export async function createAllocation(
  goalId: string,
  _prevState: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const user = await verifySession();

  const goal = await findAccessibleGoal(goalId, user.familyId, user.id);
  if (!goal) return { message: "ไม่พบกระเป๋านี้" };

  const validated = AllocationSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    value: formData.get("value"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  await db.insert(goalAllocations).values({
    goalId,
    label: validated.data.label,
    type: validated.data.type,
    value: validated.data.value.toFixed(2),
  });

  revalidatePath("/goals");
  return { success: true };
}

export async function updateAllocation(
  id: string,
  goalId: string,
  _prevState: AllocationFormState,
  formData: FormData,
): Promise<AllocationFormState> {
  const user = await verifySession();

  const validated = AllocationSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    value: formData.get("value"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  await db
    .update(goalAllocations)
    .set({
      label: validated.data.label,
      type: validated.data.type,
      value: validated.data.value.toFixed(2),
    })
    .where(
      and(
        eq(goalAllocations.id, id),
        eq(goalAllocations.goalId, goalId),
        inArray(goalAllocations.goalId, accessibleGoalIds(user.familyId, user.id)),
      ),
    );

  revalidatePath("/goals");
  return { success: true };
}

export async function deleteAllocation(id: string, goalId: string) {
  const user = await verifySession();

  await db
    .delete(goalAllocations)
    .where(
      and(
        eq(goalAllocations.id, id),
        eq(goalAllocations.goalId, goalId),
        inArray(goalAllocations.goalId, accessibleGoalIds(user.familyId, user.id)),
      ),
    );

  revalidatePath("/goals");
}
