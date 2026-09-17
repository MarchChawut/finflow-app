"use server";

import * as z from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

const CategorySchema = z.object({
  name: z.string().trim().min(1, { error: "กรุณาระบุชื่อหมวดหมู่" }),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().trim().optional(),
});

export type CategoryFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await verifySession();

  const validated = CategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { name, type, color } = validated.data;

  await db.insert(categories).values({ name, type, color: color || null, familyId: user.familyId });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function updateCategory(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await verifySession();

  const validated = CategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { name, type, color } = validated.data;

  await db
    .update(categories)
    .set({ name, type, color: color || null })
    .where(and(eq(categories.id, id), eq(categories.familyId, user.familyId)));

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const user = await verifySession();
  // Safe even if in use — transactions.categoryId is ON DELETE SET NULL.
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.familyId, user.familyId)));
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");
}
