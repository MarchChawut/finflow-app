"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createRecurringBill, type RecurringBillFormState } from "@/lib/actions/recurringBills";

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
// and "edit a recurring bill" (EditRecurringBillButton.tsx) — same pattern as
// GoalModal.tsx/TransactionModal.tsx's shared form shells.
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
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [wasPending, setWasPending] = useState(false);
  if (wasPending !== pending) {
    setWasPending(pending);
    if (wasPending && !pending && !state?.errors) {
      setOpen(false);
    }
  }

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <>
      {trigger(() => setOpen(true))}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-soft-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-base">{heading}</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 text-sm">
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

              <button
                type="submit"
                disabled={pending}
                className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium transition-all"
              >
                {pending ? "กำลังบันทึก..." : submitLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
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
