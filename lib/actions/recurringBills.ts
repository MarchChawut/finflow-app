"use server";

import * as z from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recurringBills, transactions } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { getBillPeriodStart } from "@/lib/data/recurringBills";

const RecurringBillSchema = z.object({
  name: z.string().trim().min(1, { error: "กรุณาระบุชื่อรายจ่าย" }),
  amount: z.coerce.number().positive({ error: "จำนวนเงินต้องมากกว่า 0" }),
  categoryId: z.uuid().optional().or(z.literal("")),
});

export type RecurringBillFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

// Personal, like every other feature except savingsGoals ("กระเป๋า") — a
// recurring bill can only ever be touched by whoever created it.
function ownedBill(id: string, familyId: string, userId: string) {
  return and(
    eq(recurringBills.id, id),
    eq(recurringBills.familyId, familyId),
    eq(recurringBills.createdById, userId),
  );
}

export async function createRecurringBill(
  _prevState: RecurringBillFormState,
  formData: FormData,
): Promise<RecurringBillFormState> {
  const user = await verifySession();

  const validated = RecurringBillSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { name, amount, categoryId } = validated.data;

  await db.insert(recurringBills).values({
    name,
    amount: amount.toFixed(2),
    categoryId: categoryId || null,
    createdById: user.id,
    familyId: user.familyId,
  });

  revalidatePath("/transactions");
  return { success: true };
}

export async function updateRecurringBill(
  id: string,
  _prevState: RecurringBillFormState,
  formData: FormData,
): Promise<RecurringBillFormState> {
  const user = await verifySession();

  const validated = RecurringBillSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { name, amount, categoryId } = validated.data;

  await db
    .update(recurringBills)
    .set({ name, amount: amount.toFixed(2), categoryId: categoryId || null })
    .where(ownedBill(id, user.familyId, user.id));

  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteRecurringBill(id: string) {
  const user = await verifySession();
  await db.delete(recurringBills).where(ownedBill(id, user.familyId, user.id));
  revalidatePath("/transactions");
}

export async function markRecurringBillPaid(id: string) {
  const user = await verifySession();

  const bill = await db.query.recurringBills.findFirst({
    where: ownedBill(id, user.familyId, user.id),
  });
  if (!bill) return;

  // Idempotent per pay period — mirrors getRecurringBills()'s paidThisPeriod
  // check. The UI already disables the button once paid, but this guards
  // against a raced double-click/retry creating a duplicate expense transaction.
  const periodStart = await getBillPeriodStart(user.id);
  if (bill.lastPaidAt && new Date(bill.lastPaidAt) >= periodStart) return;

  await db.insert(transactions).values({
    title: bill.name,
    amount: bill.amount,
    type: "EXPENSE",
    channel: "DASHBOARD",
    categoryId: bill.categoryId,
    createdById: user.id,
    familyId: user.familyId,
    // Explicit rather than relying on the column default — set here so it
    // stays correct even if that default ever changes for a different table.
    visibility: "PERSONAL",
  });

  await db
    .update(recurringBills)
    .set({ lastPaidAt: new Date() })
    .where(ownedBill(id, user.familyId, user.id));

  revalidatePath("/transactions");
  revalidatePath("/");
}
