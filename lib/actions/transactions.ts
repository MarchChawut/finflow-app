"use server";

import * as z from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { fetchTransactionsPage } from "@/lib/data/transactions";

const TransactionSchema = z.object({
  title: z.string().trim().min(1, { error: "กรุณาระบุรายการ" }),
  amount: z.coerce.number().positive({ error: "จำนวนเงินต้องมากกว่า 0" }),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.uuid().optional().or(z.literal("")),
  channel: z.enum(["DASHBOARD", "LINE_CHAT", "LIFF_FORM", "SLIP_OCR"]).default("DASHBOARD"),
  note: z.string().trim().optional(),
});

export type TransactionFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function createTransaction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const user = await verifySession();

  const validated = TransactionSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    categoryId: formData.get("categoryId"),
    channel: formData.get("channel") || "DASHBOARD",
    note: formData.get("note"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { title, amount, type, categoryId, channel, note } = validated.data;

  await db.insert(transactions).values({
    title,
    amount: amount.toFixed(2),
    type,
    channel,
    categoryId: categoryId || null,
    note: note || null,
    createdById: user.id,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateTransaction(
  id: string,
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  await verifySession();

  const validated = TransactionSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    categoryId: formData.get("categoryId"),
    channel: formData.get("channel") || "DASHBOARD",
    note: formData.get("note"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { title, amount, type, categoryId, note } = validated.data;

  await db
    .update(transactions)
    .set({
      title,
      amount: amount.toFixed(2),
      type,
      categoryId: categoryId || null,
      note: note || null,
    })
    .where(eq(transactions.id, id));

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  await verifySession();
  await db.delete(transactions).where(eq(transactions.id, id));
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function loadMoreTransactions(offset: number) {
  await verifySession();
  return fetchTransactionsPage(offset);
}
