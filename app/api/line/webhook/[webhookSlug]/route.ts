import { NextResponse } from "next/server";
import { validateSignature, type webhook } from "@line/bot-sdk";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, savingsGoals, users } from "@/lib/db/schema";
import { getFamilyByWebhookSlug } from "@/lib/data/families";
import { getLineClientsForFamily, type LineClients } from "@/lib/line/clientForFamily";
import { decrypt } from "@/lib/crypto/encryption";
import { parseThaiMoneyMessage, type ParsedMoneyMessage } from "@/lib/line/parseMessage";
import { parseSlipText } from "@/lib/line/parseSlip";
import { googleVisionOcr } from "@/lib/ocr";
import { findMatchingGoal } from "@/lib/line/matchGoal";
import { buildGoalsSummaryText } from "@/lib/line/summaries";

// A message like "ย้ายเงินคงเหลือไปไว้ในเงินออมเพื่อไปใช้เป็นประกันรถ 250 บาท" still
// records as a normal expense (the money really did leave free balance) but
// also tries to route the amount into a matching savings goal — see
// handleSavingsTransfer below.
const SAVINGS_TRANSFER_KEYWORDS = ["เงินออม", "ออมเงิน", "เป้าหมาย"];

// Below this, a slip read is still recorded (never silently dropped) but
// flagged for the user to double-check — see TransactionsTable's
// "ตรวจสอบยอด" badge, which is the Phase 4c "manual correction UI".
const OCR_CONFIDENCE_REVIEW_THRESHOLD = 0.6;

// Excluded from Proxy's auth gate (proxy.ts matcher excludes the api/line
// prefix regardless of what follows) — LINE verifies itself via the
// signature below, not a session cookie.
//
// The [webhookSlug] segment identifies WHICH family's channel this call is
// for, before the body is even parsed — necessary because each family now
// has its own channel secret, and you can't validate a signature without
// first knowing whose secret to check it against, and can't parse the body
// to find the sender before validating the signature either.
export async function POST(request: Request, { params }: { params: Promise<{ webhookSlug: string }> }) {
  const { webhookSlug } = await params;
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  const family = await getFamilyByWebhookSlug(webhookSlug);

  // Unknown slug and "not configured yet" both mean "reject" from the
  // caller's point of view — collapsed into the same 401 as a bad signature
  // rather than a 404, so this route can't be used as a slug-existence oracle.
  if (!family || !family.lineChannelSecretEncrypted) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const channelSecret = decrypt(family.lineChannelSecretEncrypted);
  if (!validateSignature(rawBody, channelSecret, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const lineClients = getLineClientsForFamily(family);
  if (!lineClients) {
    // Secret configured but access token isn't — signature already proved
    // this really is the family's channel, so reply-less processing would
    // silently lose events; treat as "not fully configured yet" instead.
    return NextResponse.json({ ok: true });
  }

  const body = JSON.parse(rawBody) as webhook.CallbackRequest;

  await Promise.all((body.events ?? []).map((event) => handleEvent(event, family.id, lineClients)));

  // LINE requires a fast 200 regardless of what individual events did.
  return NextResponse.json({ ok: true });
}

async function handleEvent(event: webhook.Event, familyId: string, lineClients: LineClients) {
  if (event.type !== "message") return;

  const lineUserId = event.source?.type === "user" ? event.source.userId : undefined;
  const replyToken = event.replyToken;

  // The webhook slug already identified the family — but the sender still
  // needs to have bound their FinFlow login to this specific family's LINE
  // account before any write can be attributed to them.
  const bound = await isLineUserBoundToFamily(lineUserId, familyId);
  if (!bound) {
    await reply(lineClients, replyToken, "ยังไม่ได้ผูกบัญชี LINE กับ FinFlow ครับ กรุณาเข้าเว็บ FinFlow แล้วผูกบัญชีก่อนใช้งานนะครับ");
    return;
  }

  if (event.message.type === "text") {
    // Pulled into a local so narrowing survives the closures below (TS
    // loses the `event.message.type === "text"` narrowing once
    // `event.message` is accessed from inside a callback).
    const messageText = event.message.text;

    // Rich Menu quick actions (lib/actions/line.ts's setupRichMenu) send
    // these two exact phrases as plain text messages — handle them before
    // the money parser so they don't get misread as "record an expense
    // called 'สรุปยอดวันนี้'".
    if (messageText === "สรุปยอดวันนี้") {
      await reply(lineClients, replyToken, await buildTodaySummaryText(familyId));
      return;
    }
    if (messageText === "เป้าหมายออมเงิน") {
      await reply(lineClients, replyToken, await buildGoalsSummaryText(familyId));
      return;
    }
    // Rich Menu's "บันทึกจดเงิน" button falls back to this plain message
    // when the family's liffIdQuickRecord isn't set up yet (see
    // lib/actions/line.ts's setupRichMenu) — a touch shouldn't go silent.
    if (messageText === "บันทึกจดเงิน") {
      await reply(lineClients, replyToken, "พิมพ์รายจ่าย เช่น \"กาแฟ 60\" หรือส่งรูปสลิปมาได้เลยครับ");
      return;
    }

    const parsed = parseThaiMoneyMessage(messageText);

    if (!parsed) {
      await reply(
        lineClients,
        replyToken,
        'พิมพ์รายการพร้อมจำนวนเงินนะครับ เช่น "ข้าวผัดกะเพรา 60" หรือ "เงินเดือนเข้า 45000"',
      );
      return;
    }

    await db.insert(transactions).values({
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      channel: "LINE_CHAT",
      lineUserId,
      familyId,
    });

    const sign = parsed.type === "INCOME" ? "+" : "-";
    const baseReply = `บันทึกแล้ว ✅\n${parsed.title}\n${sign}${parsed.amount.toLocaleString("th-TH")} บาท`;

    if (SAVINGS_TRANSFER_KEYWORDS.some((kw) => messageText.includes(kw))) {
      await handleSavingsTransfer(lineClients, familyId, replyToken, parsed, messageText, baseReply);
      return;
    }

    await reply(lineClients, replyToken, baseReply);
    return;
  }

  if (event.message.type === "image") {
    await handleImageMessage(lineClients, familyId, event.message.id, replyToken, lineUserId);
  }
}

async function isLineUserBoundToFamily(
  lineUserId: string | undefined,
  familyId: string,
): Promise<boolean> {
  if (!lineUserId) return false;
  const matched = await db.query.users.findFirst({
    where: and(eq(users.lineUserId, lineUserId), eq(users.familyId, familyId)),
    columns: { id: true },
  });
  return Boolean(matched);
}

async function handleSavingsTransfer(
  lineClients: LineClients,
  familyId: string,
  replyToken: string | undefined,
  parsed: ParsedMoneyMessage,
  originalText: string,
  baseReply: string,
) {
  const goals = await db.query.savingsGoals.findMany({
    where: eq(savingsGoals.familyId, familyId),
  });
  const matched = findMatchingGoal(goals, originalText);

  if (!matched) {
    const goalList =
      goals.length > 0
        ? goals.map((g) => `• ${g.title}`).join("\n")
        : "ยังไม่มีเป้าหมายการออมเลย — สร้างได้ที่เว็บ FinFlow ก่อนนะครับ";
    await reply(
      lineClients,
      replyToken,
      `${baseReply}\n\n🤔 ไม่แน่ใจว่าจะเติมเข้าเป้าหมายไหน ลองพิมพ์ชื่อเป้าหมายให้ชัดเจนกว่านี้ หรือไปเติมเงินที่เว็บ FinFlow แทนนะครับ\nเป้าหมายที่มีตอนนี้:\n${goalList}`,
    );
    return;
  }

  await db
    .update(savingsGoals)
    .set({
      currentAmount: sql`${savingsGoals.currentAmount} + ${parsed.amount.toFixed(2)}`,
    })
    .where(and(eq(savingsGoals.id, matched.id), eq(savingsGoals.familyId, familyId)));

  const updatedCurrent = Number(matched.currentAmount) + parsed.amount;
  const target = Number(matched.targetAmount);
  const percent = target > 0 ? Math.min(100, Math.round((updatedCurrent / target) * 100)) : 0;

  await reply(
    lineClients,
    replyToken,
    `${baseReply}\n\n💰 เติมเข้าเป้าหมาย "${matched.title}" +${parsed.amount.toLocaleString("th-TH")} บาท\nตอนนี้: ${updatedCurrent.toLocaleString("th-TH")} / ${target.toLocaleString("th-TH")} บาท (${percent}%)`,
  );
}

async function handleImageMessage(
  lineClients: LineClients,
  familyId: string,
  messageId: string,
  replyToken: string | undefined,
  lineUserId: string | undefined,
) {
  try {
    const imageBuffer = await downloadMessageContent(lineClients, messageId);
    const { rawText, confidence } = await googleVisionOcr.extractText(imageBuffer);
    const parsed = parseSlipText(rawText);

    if (!parsed) {
      await reply(
        lineClients,
        replyToken,
        "อ่านยอดเงินจากรูปไม่ออกครับ 🧐 ช่วยพิมพ์รายการเป็นข้อความแทนได้ไหม เช่น \"ค่าอาหาร 150\"",
      );
      return;
    }

    // Deliberately not persisting the slip image itself (no object storage
    // configured yet) — see the Phase 4 plan's "slip image storage" note.
    await db.insert(transactions).values({
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      channel: "SLIP_OCR",
      lineUserId,
      ocrConfidence: confidence,
      familyId,
    });

    const lowConfidence = confidence < OCR_CONFIDENCE_REVIEW_THRESHOLD;
    const sign = parsed.type === "INCOME" ? "+" : "-";
    await reply(
      lineClients,
      replyToken,
      `บันทึกแล้ว ✅ (จากสลิป)\n${parsed.title}\n${sign}${parsed.amount.toLocaleString("th-TH")} บาท` +
        (lowConfidence
          ? "\n\n⚠️ อ่านยอดไม่ค่อยชัด ช่วยตรวจสอบและแก้ไขในเว็บ FinFlow อีกทีนะครับ"
          : ""),
    );
  } catch (err) {
    // Expected until a real GOOGLE_APPLICATION_CREDENTIALS exists — degrade
    // to asking for text input rather than a 500 (LINE still requires 200).
    console.error("[line webhook] slip OCR failed:", err);
    await reply(
      lineClients,
      replyToken,
      "ระบบอ่านสลิปอัตโนมัติยังใช้งานไม่ได้ตอนนี้ครับ ช่วยพิมพ์รายการเป็นข้อความแทนก่อนนะครับ",
    );
  }
}

async function buildTodaySummaryText(familyId: string): Promise<string> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.familyId, familyId),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      ),
    );

  const income = Number(totals.income);
  const expense = Number(totals.expense);

  return (
    `สรุปยอดวันนี้ 📊\n` +
    `รายรับ: +${income.toLocaleString("th-TH")} บาท\n` +
    `รายจ่าย: -${expense.toLocaleString("th-TH")} บาท\n` +
    `คงเหลือวันนี้: ${(income - expense).toLocaleString("th-TH")} บาท`
  );
}

async function downloadMessageContent(lineClients: LineClients, messageId: string): Promise<Buffer> {
  const stream = await lineClients.blobClient.getMessageContent(messageId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function reply(lineClients: LineClients, replyToken: string | undefined, text: string) {
  if (!replyToken) return;
  try {
    await lineClients.client.replyMessage({
      replyToken,
      messages: [{ type: "text", text }],
    });
  } catch (err) {
    // Expected while a family's real access token is still invalid/unset —
    // LINE still requires this route to answer 200, so don't let a failed
    // reply turn into a 500 for the whole webhook call.
    console.error("[line webhook] replyMessage failed:", err);
  }
}

