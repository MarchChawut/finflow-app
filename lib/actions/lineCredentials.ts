"use server";

import * as z from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { encrypt } from "@/lib/crypto/encryption";

const CredentialsSchema = z.object({
  channelAccessToken: z.string().trim().optional(),
  channelSecret: z.string().trim().optional(),
  liffId: z.string().trim().optional(),
  liffIdQuickRecord: z.string().trim().optional(),
});

export type LineCredentialsFormState = {
  errors?: Record<string, string[]>;
  error?: string;
  success?: boolean;
} | undefined;

// Admin-gated, same as inviteFamilyMember — these credentials give the
// bearer control of the family's real LINE OA channel, so unlike most
// "family data is intentionally unscoped" actions in this app, editing them
// is restricted to the host.
//
// Blank field = "leave unchanged," never "clear it" — a decrypted secret is
// never round-tripped back into the form for display, so a blank submission
// can't mean "I saw the current value and deleted it." Use
// disconnectLineCredentials() to explicitly clear everything.
export async function updateLineCredentials(
  _prevState: LineCredentialsFormState,
  formData: FormData,
): Promise<LineCredentialsFormState> {
  const user = await verifySession();
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่ตั้งค่า LINE Official Account ได้" };
  }

  const validated = CredentialsSchema.safeParse({
    channelAccessToken: formData.get("channelAccessToken"),
    channelSecret: formData.get("channelSecret"),
    liffId: formData.get("liffId"),
    liffIdQuickRecord: formData.get("liffIdQuickRecord"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { channelAccessToken, channelSecret, liffId, liffIdQuickRecord } = validated.data;

  const set: Partial<typeof families.$inferInsert> = {};
  if (channelAccessToken) set.lineChannelAccessTokenEncrypted = encrypt(channelAccessToken);
  if (channelSecret) set.lineChannelSecretEncrypted = encrypt(channelSecret);
  if (liffId) set.liffId = liffId;
  if (liffIdQuickRecord) set.liffIdQuickRecord = liffIdQuickRecord;

  if (Object.keys(set).length === 0) {
    return { error: "ไม่มีข้อมูลที่จะบันทึก — กรอกอย่างน้อยหนึ่งช่อง" };
  }

  await db.update(families).set(set).where(eq(families.id, user.familyId));

  revalidatePath("/settings");
  return { success: true };
}

// Explicit full clear — separate from updateLineCredentials so "leave
// unchanged" (blank) and "clear" are never ambiguous. Does not touch
// webhookSlug, which is an independent identifier unaffected by a
// credential rotation/removal.
export async function disconnectLineCredentials(): Promise<LineCredentialsFormState> {
  const user = await verifySession();
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่ยกเลิกการเชื่อมต่อได้" };
  }

  await db
    .update(families)
    .set({
      lineChannelAccessTokenEncrypted: null,
      lineChannelSecretEncrypted: null,
      liffId: null,
      liffIdQuickRecord: null,
    })
    .where(eq(families.id, user.familyId));

  revalidatePath("/settings");
  return { success: true };
}
