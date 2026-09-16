"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userBudgetSettings } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import type { BudgetRatioPart } from "@/lib/data/budgetSettings";

export async function setUserBudgetSettings({
  income,
  parts,
}: {
  income: string;
  parts: BudgetRatioPart[];
}) {
  const user = await verifySession();

  const partsJson = JSON.stringify(parts);

  await db
    .insert(userBudgetSettings)
    .values({ userId: user.id, income, parts: partsJson })
    .onConflictDoUpdate({
      target: userBudgetSettings.userId,
      set: { income, parts: partsJson, updatedAt: new Date() },
    });

  revalidatePath("/tools");
}
