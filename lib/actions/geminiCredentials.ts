"use server";

import * as z from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { encrypt } from "@/lib/crypto/encryption";

const CredentialsSchema = z.object({
  apiKey: z.string().trim().optional(),
});

export type GeminiCredentialsFormState = {
  errors?: Record<string, string[]>;
  error?: string;
  success?: boolean;
} | undefined;

// Admin-gated, same as lib/actions/lineCredentials.ts. Blank field = "leave
// unchanged," never "clear it" — the key is never round-tripped back into
// the form for display, so a blank submission can't mean "I saw it and
// deleted it." Use disconnectGeminiApiKey() to explicitly clear it.
export async function updateGeminiApiKey(
  _prevState: GeminiCredentialsFormState,
  formData: FormData,
): Promise<GeminiCredentialsFormState> {
  const user = await verifySession();
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่ตั้งค่า Gemini API key ได้" };
  }

  const validated = CredentialsSchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { apiKey } = validated.data;
  if (!apiKey) {
    return { error: "ไม่มีข้อมูลที่จะบันทึก — กรอก API key ก่อน" };
  }

  await db
    .update(families)
    .set({ geminiApiKeyEncrypted: encrypt(apiKey) })
    .where(eq(families.id, user.familyId));

  revalidatePath("/settings");
  revalidatePath("/ai-advisor");
  return { success: true };
}

export async function disconnectGeminiApiKey(): Promise<GeminiCredentialsFormState> {
  const user = await verifySession();
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่ยกเลิกการเชื่อมต่อได้" };
  }

  await db
    .update(families)
    .set({ geminiApiKeyEncrypted: null })
    .where(eq(families.id, user.familyId));

  revalidatePath("/settings");
  revalidatePath("/ai-advisor");
  return { success: true };
}
