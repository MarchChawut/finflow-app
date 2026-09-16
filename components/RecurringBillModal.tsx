"use client";

import type { ReactNode } from "react";
import { createRecurringBill, type RecurringBillFormState } from "@/lib/actions/recurringBills";
import { FormModal } from "@/components/FormModal";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

const initialState: RecurringBillFormState = undefined;

type RecurringBillFormAction = (
  prevState: RecurringBillFormState,
  formData: FormData,
) => Promise<RecurringBillFormState> | RecurringBillFormState;

type RecurringBillInitialValues = {
  name?: string;
  amount?: string;
  categoryId?: string | null;
};

// Shared shell for both "create a recurring bill" (RecurringBillModal, below)
// and "edit a recurring bill" (EditRecurringBillButton.tsx) — see
// components/FormModal.tsx for the modal shell itself.
export function RecurringBillFormModal({
  trigger,
  heading,
  submitLabel,
  action,
  categories,
  initialValues,
}: {
  trigger: (open: () => void) => ReactNode;
  heading: string;
  submitLabel: string;
  action: RecurringBillFormAction;
  categories: Category[];
  initialValues?: RecurringBillInitialValues;
}) {
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <FormModal
      trigger={trigger}
      heading={heading}
      submitLabel={submitLabel}
      action={action}
      initialState={initialState}
    >
      {(state) => (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              ชื่อรายจ่าย
            </label>
            <input
              name="name"
              required
              defaultValue={initialValues?.name}
              placeholder="เช่น ค่าน้ำ"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            {state?.errors?.name && (
              <p className="text-[11px] text-rose-500 mt-1">{state.errors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              จำนวนเงิน (บาท/เดือน)
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initialValues?.amount}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            {state?.errors?.amount && (
              <p className="text-[11px] text-rose-500 mt-1">{state.errors.amount[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              หมวดหมู่
            </label>
            <select
              name="categoryId"
              defaultValue={initialValues?.categoryId ?? ""}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">ไม่ระบุ</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </FormModal>
  );
}

export function RecurringBillModal({ categories }: { categories: Category[] }) {
  return (
    <RecurringBillFormModal
      heading="เพิ่มรายจ่ายประจำเดือน"
      submitLabel="เพิ่มรายจ่าย"
      action={createRecurringBill}
      categories={categories}
      trigger={(open) => (
        <button
          onClick={open}
          className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-md shadow-purple-200 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> เพิ่มรายจ่ายประจำเดือน
        </button>
      )}
    />
  );
}
