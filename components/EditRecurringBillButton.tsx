"use client";

import { updateRecurringBill } from "@/lib/actions/recurringBills";
import { RecurringBillFormModal } from "@/components/RecurringBillModal";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

export function EditRecurringBillButton({
  bill,
  categories,
}: {
  bill: { id: string; name: string; amount: string; categoryId: string | null };
  categories: Category[];
}) {
  return (
    <RecurringBillFormModal
      heading="แก้ไขรายจ่ายประจำเดือน"
      submitLabel="บันทึกการแก้ไข"
      action={updateRecurringBill.bind(null, bill.id)}
      categories={categories}
      initialValues={{
        name: bill.name,
        amount: bill.amount,
        categoryId: bill.categoryId,
      }}
      trigger={(open) => (
        <button
          onClick={open}
          title="แก้ไขรายจ่าย"
          className="text-slate-300 hover:text-slate-600 transition-colors"
        >
          <i className="fa-solid fa-pen text-xs" />
        </button>
      )}
    />
  );
}
