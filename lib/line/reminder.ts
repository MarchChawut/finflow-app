import "server-only";
import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { messagingApiClient } from "@/lib/line/client";
import { buildGoalsSummaryText } from "@/lib/line/summaries";

// Shared by the cron endpoint (app/api/cron/savings-reminder/route.ts, for
// real scheduled runs) and the "ส่งตอนนี้เลย" manual button on /settings
// (lib/actions/appSettings.ts) — one implementation either way.
export async function sendSavingsReminder(): Promise<{ sent: number; failed: number }> {
  const summary = await buildGoalsSummaryText();
  const text = `🔔 แจ้งเตือนออมเงินประจำเดือน\n\n${summary}`;

  const boundUsers = await db.query.users.findMany({
    where: isNotNull(users.lineUserId),
    columns: { lineUserId: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of boundUsers) {
    if (!user.lineUserId) continue;
    try {
      await messagingApiClient.pushMessage({
        to: user.lineUserId,
        messages: [{ type: "text", text }],
      });
      sent++;
    } catch (err) {
      console.error("[savings reminder] pushMessage failed:", err);
      failed++;
    }
  }

  return { sent, failed };
}
