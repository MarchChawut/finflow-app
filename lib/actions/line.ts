"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { messagingApiClient, messagingApiBlobClient } from "@/lib/line/client";
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

  let lineUserId: string;
  try {
    ({ sub: lineUserId } = await verifyLineIdToken(idToken));
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
  await verifySession();

  const quickRecordLiffId = process.env.NEXT_PUBLIC_LIFF_ID_QUICK_RECORD;
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
    const { richMenuId } = await messagingApiClient.createRichMenu({
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
          // prompt (handled by app/api/line/webhook/route.ts).
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
    await messagingApiBlobClient.setRichMenuImage(
      richMenuId,
      new Blob([new Uint8Array(png)], { type: "image/png" }),
    );
    await messagingApiClient.setDefaultRichMenu(richMenuId);
  } catch (err) {
    console.error("[setupRichMenu] failed:", err);
    return {
      error:
        "ตั้งค่า Rich Menu ไม่สำเร็จ — ตรวจสอบว่า LINE_CHANNEL_ACCESS_TOKEN ใน .env เป็นค่าจริงแล้วหรือยัง",
    };
  }

  return { success: true };
}
