import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { verifySession } from "@/lib/dal";
import { CHANNEL_LABELS } from "@/lib/format";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  // A plain link click (not a fetch call) — verifySession()'s redirect just
  // navigates the browser to /login like any other protected page.
  await verifySession();

  const rows = await db.query.transactions.findMany({
    with: { category: true },
    orderBy: [desc(transactions.occurredAt)],
  });

  const header = ["วันที่", "รายการ", "หมวดหมู่", "ช่องทาง", "ประเภท", "จำนวนเงิน (บาท)"];
  const lines = [header.map(csvEscape).join(",")];

  for (const tx of rows) {
    lines.push(
      [
        tx.occurredAt.toISOString(),
        tx.title,
        tx.category?.name ?? "",
        CHANNEL_LABELS[tx.channel] ?? tx.channel,
        tx.type === "INCOME" ? "รายรับ" : "รายจ่าย",
        tx.amount,
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }

  // Leading BOM so Excel (incl. Thai Windows builds) opens the UTF-8 file
  // with Thai text intact instead of mojibake.
  const csv = "﻿" + lines.join("\n");
  const filename = `finflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
