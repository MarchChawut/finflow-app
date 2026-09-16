import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
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

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "savings_reminder_enabled"));

  if (row?.value !== "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "reminder disabled" });
  }

  const result = await sendSavingsReminder();
  return NextResponse.json({ ok: true, ...result });
}
