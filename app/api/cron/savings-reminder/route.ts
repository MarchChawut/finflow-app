import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { sendSavingsReminder } from "@/lib/line/reminder";

// Not session-gated (no browser session exists when a cron caller hits
// this) — authenticated via a shared secret instead. Excluded from
// proxy.ts's matcher isn't needed since it's under /api, already excluded
// there, but it still needs its OWN auth since the LINE-signature trust
// boundary doesn't apply here either.
//
// This route being reachable does not by itself make reminders "automatic"
// — something outside this app (NAS cron once deployed, or a local
// launchd/cron entry meanwhile) has to actually call it on a schedule. See
// the note on /settings and tasks/plan.md.

// Constant-time compare — a plain `!==` leaks a timing side-channel that
// could theoretically help recover the secret byte-by-byte.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  // Header only — a URL query string ends up in server/proxy/edge access
  // logs (and browser history, if ever opened by hand), which a secret
  // shouldn't.
  const providedSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || !providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Multi-tenant: each family opts in independently, so this loops over
  // every family rather than reading one global setting. All families still
  // send via the one shared LINE OA client until Phase 2 gives each family
  // its own credentials.
  const allFamilies = await db.query.families.findMany({ columns: { id: true } });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const family of allFamilies) {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(and(eq(appSettings.familyId, family.id), eq(appSettings.key, "savings_reminder_enabled")));

    if (row?.value !== "true") {
      skipped++;
      continue;
    }

    const result = await sendSavingsReminder(family.id);
    sent += result.sent;
    failed += result.failed;
  }

  return NextResponse.json({ ok: true, sent, failed, familiesSkipped: skipped });
}
