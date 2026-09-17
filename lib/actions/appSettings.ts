"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { sendSavingsReminder } from "@/lib/line/reminder";
import type { BudgetRatioPart } from "@/lib/data/budgetSettings";

export async function upsertSetting(familyId: string, key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ familyId, key, value })
    .onConflictDoUpdate({
      target: [appSettings.familyId, appSettings.key],
      set: { value, updatedAt: new Date() },
    });
}

// Picking a date off the calendar saves immediately — no separate save step
// for this card. `dateString` comes from a native <input type="date">,
// already constrained to YYYY-MM-DD, but guard against a bad/empty value
// (e.g. the field cleared mid-edit) rather than writing an invalid date.
export async function setUsagePeriodExpiresAt(dateString: string) {
  const user = await verifySession();

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return;

  await upsertSetting(user.familyId, "usage_period_expires_at", parsed.toISOString());
  revalidatePath("/settings");
}

export async function setSavingsReminderEnabled(enabled: boolean) {
  const user = await verifySession();
  await upsertSetting(user.familyId, "savings_reminder_enabled", enabled ? "true" : "false");
  revalidatePath("/settings");
}

export async function sendSavingsReminderNow(): Promise<{ sent: number; failed: number }> {
  const user = await verifySession();
  return sendSavingsReminder(user.familyId);
}

// Not admin-gated: same "family data is intentionally unscoped" precedent as
// categories/recurring bills — anyone in the family can edit the shared view.
export async function setFamilyBudgetSettings({
  income,
  parts,
}: {
  income: string;
  parts: BudgetRatioPart[];
}) {
  const user = await verifySession();
  await upsertSetting(user.familyId, "family_budget_settings", JSON.stringify({ income, parts }));
  revalidatePath("/tools");
}
