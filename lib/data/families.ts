import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

// Non-secret fields only — safe to pass down into a client component
// (components/LineCredentialsForm.tsx, GeminiApiKeyForm, LiffBinder,
// QuickRecordForm). Never return the encrypted columns from here; use
// getFamilySecretsById (server-internal only) for anything that needs the
// real secret.
export const getFamilyLineSettings = cache(async () => {
  const user = await verifySession();
  const [row] = await db
    .select({
      webhookSlug: families.webhookSlug,
      liffId: families.liffId,
      liffIdQuickRecord: families.liffIdQuickRecord,
      hasAccessToken: families.lineChannelAccessTokenEncrypted,
      hasChannelSecret: families.lineChannelSecretEncrypted,
      hasGeminiApiKey: families.geminiApiKeyEncrypted,
    })
    .from(families)
    .where(eq(families.id, user.familyId));

  return {
    webhookSlug: row?.webhookSlug ?? null,
    liffId: row?.liffId ?? null,
    liffIdQuickRecord: row?.liffIdQuickRecord ?? null,
    hasAccessToken: Boolean(row?.hasAccessToken),
    hasChannelSecret: Boolean(row?.hasChannelSecret),
    hasGeminiApiKey: Boolean(row?.hasGeminiApiKey),
  };
});

// Server-internal only (webhook route, setupRichMenu, sendSavingsReminder,
// verifyIdToken's caller, lib/actions/coach.ts) — carries every one of a
// family's encrypted/secret columns (LINE + Gemini). Never pass this return
// value into a client component's props.
export async function getFamilySecretsById(familyId: string) {
  const [row] = await db.select().from(families).where(eq(families.id, familyId));
  return row ?? null;
}

export async function getFamilyByWebhookSlug(webhookSlug: string) {
  const [row] = await db.select().from(families).where(eq(families.webhookSlug, webhookSlug));
  return row ?? null;
}
