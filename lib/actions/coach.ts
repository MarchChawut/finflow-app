"use server";

import * as z from "zod";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@google/genai";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { getFamilySecretsById } from "@/lib/data/families";
import { getGeminiClientForFamily, COACH_MODEL } from "@/lib/gemini/client";
import { buildFinancialContextText, COACH_SYSTEM_INSTRUCTION } from "@/lib/gemini/prompt";
import { upsertSetting } from "@/lib/actions/appSettings";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { getGoals } from "@/lib/data/goals";
import { getFamilyBudgetSettings } from "@/lib/data/appSettings";
import { getRecurringBills } from "@/lib/data/recurringBills";

const QuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, { error: "กรุณาพิมพ์คำถาม" })
    .max(500, { error: "คำถามยาวเกินไป (สูงสุด 500 ตัวอักษร)" }),
});

export type CoachFormState = {
  errors?: Record<string, string[]>;
  error?: string;
  advice?: string;
} | undefined;

// Protects the family's own paid/free-tier key from being hammered by a
// double-submit or repeated button-mashing — every MEMBER can trigger a
// billed call against the ADMIN's key, this is the only throttle on that.
const COOLDOWN_MS = 15_000;
const COOLDOWN_KEY = "gemini_last_request_at";

export async function getCoachAdvice(
  _prevState: CoachFormState,
  formData: FormData,
): Promise<CoachFormState> {
  const user = await verifySession();

  const validated = QuestionSchema.safeParse({ question: formData.get("question") });
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }
  const { question } = validated.data;

  const family = await getFamilySecretsById(user.familyId);
  const client = family ? getGeminiClientForFamily(family.geminiApiKeyEncrypted) : null;
  if (!client) {
    return {
      error: "ยังไม่ได้ตั้งค่า Gemini API key สำหรับครอบครัวนี้ — ให้แอดมินตั้งค่าที่หน้าตั้งค่าก่อน",
    };
  }

  const [cooldownRow] = await db
    .select()
    .from(appSettings)
    .where(and(eq(appSettings.familyId, user.familyId), eq(appSettings.key, COOLDOWN_KEY)));
  if (cooldownRow && Date.now() - new Date(cooldownRow.value).getTime() < COOLDOWN_MS) {
    return { error: "กรุณารอสักครู่ก่อนถามคำถามใหม่" };
  }
  await upsertSetting(user.familyId, COOLDOWN_KEY, new Date().toISOString());

  const [dashboard, goals, budget, bills] = await Promise.all([
    getDashboardSummary(),
    getGoals(),
    getFamilyBudgetSettings(),
    getRecurringBills(),
  ]);
  const context = buildFinancialContextText({ dashboard, goals, budget, bills });

  try {
    const response = await client.models.generateContent({
      model: COACH_MODEL,
      contents: `${context}\n\nคำถาม: ${question}`,
      config: {
        systemInstruction: COACH_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1024,
      },
    });

    const advice = response.text;
    if (!advice) {
      return { error: "ไม่ได้รับคำตอบจาก AI ลองใหม่อีกครั้ง" };
    }
    return { advice };
  } catch (err) {
    console.error("[coach] generateContent failed:", err);
    if (err instanceof ApiError && err.status === 429) {
      return { error: "ใช้งาน Gemini API เกินโควต้าของคีย์นี้ ลองใหม่อีกครั้งภายหลัง" };
    }
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return { error: "Gemini API key ไม่ถูกต้อง — ตรวจสอบที่หน้าตั้งค่า" };
    }
    return { error: "เกิดข้อผิดพลาดในการเชื่อมต่อ Gemini AI ลองใหม่อีกครั้ง" };
  }
}
