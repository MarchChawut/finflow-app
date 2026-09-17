import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getFamilySecretsById } from "@/lib/data/families";
import { getLineClientsForFamily } from "@/lib/line/clientForFamily";
import { buildGoalsSummaryText } from "@/lib/line/summaries";

// Shared by the cron endpoint (app/api/cron/savings-reminder/route.ts, for
// real scheduled runs) and the "ส่งตอนนี้เลย" manual button on /settings
// (lib/actions/appSettings.ts) — one implementation either way. Scoped to one
// family at a time; the cron route loops over every family.
export async function sendSavingsReminder(
  familyId: string,
): Promise<{ sent: number; failed: number }> {
  const family = await getFamilySecretsById(familyId);
  const lineClients = family ? getLineClientsForFamily(family) : null;
  if (!lineClients) {
    console.log(`[savings reminder] family ${familyId} has no LINE OA configured yet — skipped`);
    return { sent: 0, failed: 0 };
  }

  const summary = await buildGoalsSummaryText(familyId);
  const text = `🔔 แจ้งเตือนออมเงินประจำเดือน\n\n${summary}`;

  const boundUsers = await db.query.users.findMany({
    where: and(eq(users.familyId, familyId), isNotNull(users.lineUserId)),
    columns: { lineUserId: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of boundUsers) {
    if (!user.lineUserId) continue;
    try {
      await lineClients.client.pushMessage({
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
