import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import {
  DEFAULT_BUDGET_RATIO_PARTS,
  DEFAULT_INCOME,
  type BudgetRatioPart,
} from "@/lib/data/budgetSettings";

// No saved row yet (first run) — default to a year out, matching this
// feature's "pick a fiscal-year-end-style date" framing.
function defaultExpiresAt(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export const getUsagePeriod = cache(async () => {
  await verifySession();

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "usage_period_expires_at"));

  const expiresAt = row ? new Date(row.value) : defaultExpiresAt();

  return { expiresAt };
});

export const getSavingsReminderEnabled = cache(async () => {
  await verifySession();
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "savings_reminder_enabled"));
  return row?.value === "true";
});

export const getFamilyBudgetSettings = cache(async (): Promise<{
  income: string;
  parts: BudgetRatioPart[];
}> => {
  await verifySession();
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "family_budget_settings"));

  if (!row) {
    return { income: DEFAULT_INCOME, parts: DEFAULT_BUDGET_RATIO_PARTS };
  }

  try {
    const parsed = JSON.parse(row.value);
    if (parsed && Array.isArray(parsed.parts) && parsed.parts.length > 0) {
      return { income: parsed.income ?? DEFAULT_INCOME, parts: parsed.parts };
    }
  } catch {
    // fall through to default below
  }
  return { income: DEFAULT_INCOME, parts: DEFAULT_BUDGET_RATIO_PARTS };
});
