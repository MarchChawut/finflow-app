"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { invitedEmails } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin-gated: inviting someone grants them full access to shared financial
// data with no approval step, so unlike most "unscoped family data" actions
// in this app, this one specifically controls who gets in at all.
type InviteResult = { error: string } | { qrDataUrl: string; loginUrl: string };

export async function inviteFamilyMember(email: string): Promise<InviteResult> {
  const user = await verifySession();
  if (user.role !== "ADMIN") {
    return { error: "เฉพาะแอดมินเท่านั้นที่เชิญสมาชิกใหม่ได้" };
  }

  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return { error: "อีเมลไม่ถูกต้อง" };
  }

  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    return { error: "ยังไม่ได้ตั้งค่า AUTH_URL ใน .env" };
  }

  await db
    .insert(invitedEmails)
    .values({ email: normalized, invitedById: user.id, familyId: user.familyId })
    .onConflictDoNothing();

  revalidatePath("/family");

  const loginUrl = `${authUrl}/login`;
  const qrDataUrl = await QRCode.toDataURL(loginUrl);

  return { qrDataUrl, loginUrl };
}
