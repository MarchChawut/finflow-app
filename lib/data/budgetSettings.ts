import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userBudgetSettings } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export type BudgetRatioPart = { label: string; percent: string };

export const DEFAULT_INCOME = "30000";
export const DEFAULT_BUDGET_RATIO_PARTS: BudgetRatioPart[] = [
  { label: "จำเป็น", percent: "50" },
  { label: "อยากได้", percent: "30" },
  { label: "เงินออม", percent: "20" },
];

export const getUserBudgetSettings = cache(async (): Promise<{
  income: string;
  parts: BudgetRatioPart[];
}> => {
  const user = await verifySession();

  const row = await db.query.userBudgetSettings.findFirst({
    where: eq(userBudgetSettings.userId, user.id),
  });

  if (!row) {
    return { income: DEFAULT_INCOME, parts: DEFAULT_BUDGET_RATIO_PARTS };
  }

  let parts = DEFAULT_BUDGET_RATIO_PARTS;
  try {
    const parsed = JSON.parse(row.parts);
    if (Array.isArray(parsed) && parsed.length > 0) parts = parsed;
  } catch {
    // fall through to default parts
  }

  return { income: row.income ?? DEFAULT_INCOME, parts };
});
