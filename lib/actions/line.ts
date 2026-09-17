"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { getFamilyLineSettings, getFamilySecretsById } from "@/lib/data/families";
import { getLineClientsForFamily } from "@/lib/line/clientForFamily";
import { verifyLineIdToken } from "@/lib/line/verifyIdToken";
import {
  generateRichMenuPng,
  RICH_MENU_SIZE,
  RICH_MENU_COLUMN_WIDTH,
  RICH_MENU_ROW_HEIGHT,
} from "@/lib/line/richMenuImage";

export type LineActionState = { error?: string; success?: boolean } | undefined;

// Postgres unique_violation — see https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";

export async function bindLineAccount(idToken: string): Promise<LineActionState> {
  const user = await verifySession();

  const { liffId } = await getFamilyLineSettings();
  if (!liffId) {
    return { error: "ยังไม่ได้ตั้งค่า LIFF ID สำหรับครอบครัวนี้ — ให้แอดมินตั้งค่าที่หน้าตั้งค่าก่อน" };
  }

  let lineUserId: string;
  try {
    ({ sub: lineUserId } = await verifyLineIdToken(idToken, liffId));
  } catch {
    return { error: "ยืนยันตัวตนไลน์ไม่สำเร็จ กรุณาลองใหม่" };
  }

  try {
    await db.update(users).set({ lineUserId }).where(eq(users.id, user.id));
  } catch (err) {
    const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code
      ?? (err as { code?: string })?.code;
    if (code === PG_UNIQUE_VIOLATION) {
      return { error: "บัญชีไลน์นี้ผูกกับผู้ใช้คนอื่นไปแล้ว" };
    }
    throw err;
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function unbindLineAccount(): Promise<LineActionState> {
  const user = await verifySession();
  await db.update(users).set({ lineUserId: null }).where(eq(users.id, user.id));
  revalidatePath("/settings");
  return { success: true };
}

export async function setupRichMenu(): Promise<LineActionState> {
  const user = await verifySession();
  // Admin-gated: this now acts on the family's own LINE OA credentials (an
  // admin-managed secret), same reasoning as who may view/edit them in
  // Settings — not the "family data is intentionally unscoped" precedent
  // other actions in this app follow.
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่ตั้งค่า Rich Menu ได้" };
  }

  const family = await getFamilySecretsById(user.familyId);
  const lineClients = family ? getLineClientsForFamily(family) : null;
  if (!lineClients) {
    return {
      error: "ยังไม่ได้ตั้งค่า LINE OA สำหรับครอบครัวนี้ — กรอกข้อมูลที่การ์ด LINE Official Account ด้านบนก่อน",
    };
  }

  const quickRecordLiffId = family?.liffIdQuickRecord ?? undefined;
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    return { error: "ยังไม่ได้ตั้งค่า AUTH_URL ใน .env" };
  }
  const colW = RICH_MENU_COLUMN_WIDTH;
  const rowH = RICH_MENU_ROW_HEIGHT;

  // 3 rows x 2 columns, matching lib/line/richMenuImage.ts's ZONES layout —
  // bounds must stay in the same order/positions as the drawn grid.
  const bounds = (row: number, col: number) => ({
    x: col * colW,
    y: row * rowH,
    width: colW,
    height: rowH,
  });

  try {
    const { richMenuId } = await lineClients.client.createRichMenu({
      size: RICH_MENU_SIZE,
      selected: true,
      name: "FinFlow main menu",
      chatBarText: "เมนู",
      areas: [
        {
          bounds: bounds(0, 0),
          // Deep-links into the quick-record LIFF app. Falls back to a
          // generic message if that LIFF app hasn't been set up yet (needs a
          // 2nd LIFF app registered in the LINE Developers Console — see
          // .env.example) — a broken liff.line.me URL is worse than a text
          // prompt (handled by app/api/line/webhook/[webhookSlug]/route.ts).
          action: quickRecordLiffId
            ? { type: "uri", uri: `https://liff.line.me/${quickRecordLiffId}` }
            : { type: "message", text: "บันทึกจดเงิน" },
        },
        {
          bounds: bounds(0, 1),
          action: { type: "uri", uri: `${authUrl}/` },
        },
        {
          bounds: bounds(1, 0),
          action: { type: "uri", uri: `${authUrl}/family` },
        },
        {
          bounds: bounds(1, 1),
          action: { type: "uri", uri: `${authUrl}/goals` },
        },
        {
          bounds: bounds(2, 0),
          action: { type: "uri", uri: `${authUrl}/tools` },
        },
        {
          bounds: bounds(2, 1),
          action: { type: "uri", uri: `${authUrl}/ai-advisor` },
        },
      ],
    });

    const png = await generateRichMenuPng();
    await lineClients.blobClient.setRichMenuImage(
      richMenuId,
      new Blob([new Uint8Array(png)], { type: "image/png" }),
    );
    await lineClients.client.setDefaultRichMenu(richMenuId);
  } catch (err) {
    console.error("[setupRichMenu] failed:", err);
    return {
      error:
        "ตั้งค่า Rich Menu ไม่สำเร็จ — ตรวจสอบว่ากรอก Channel Access Token ของครอบครัวนี้ถูกต้องแล้วหรือยัง",
    };
  }

  return { success: true };
}
