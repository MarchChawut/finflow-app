import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savingsGoals } from "@/lib/db/schema";

// Shared between the webhook's "เป้าหมายออมเงิน" quick-reply
// (app/api/line/webhook/route.ts) and the monthly savings-reminder push
// (app/api/cron/savings-reminder/route.ts) — one source of truth for what
// "your goals progress" looks like as a LINE message.
//
// FAMILY-visibility goals only: this same text is broadcast identically to
// every bound member (see lib/line/reminder.ts's per-member push loop), with
// no per-recipient customization — including a PERSONAL goal here would leak
// it to every other family member's LINE chat.
export async function buildGoalsSummaryText(familyId: string): Promise<string> {
  const goals = await db.query.savingsGoals.findMany({
    where: and(eq(savingsGoals.familyId, familyId), eq(savingsGoals.visibility, "FAMILY")),
    orderBy: (g, { asc }) => [asc(g.createdAt)],
  });

  if (goals.length === 0) {
    return "ยังไม่มีเป้าหมายการออม — สร้างได้ที่เว็บ FinFlow ครับ";
  }

  const lines = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return `• ${g.title}: ${current.toLocaleString("th-TH")}/${target.toLocaleString("th-TH")} บาท (${percent}%)`;
  });

  return `เป้าหมายการออมเงิน 🐷\n${lines.join("\n")}`;
}
