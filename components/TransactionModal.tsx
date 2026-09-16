"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createTransaction, type TransactionFormState } from "@/lib/actions/transactions";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

const initialState: TransactionFormState = undefined;

type TransactionFormAction = (
  prevState: TransactionFormState,
  formData: FormData,
) => Promise<TransactionFormState> | TransactionFormState;

type TransactionInitialValues = {
  title?: string;
  amount?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string | null;
};

// Shared shell for both "create a transaction" (TransactionModal, below) and
// "edit a transaction" (EditTransactionButton.tsx) — same reasoning as
// GoalModal.tsx's GoalFormModal: one form, two bound server actions, so they
// can't drift apart.
export function TransactionFormModal({
  trigger,
  heading,
  submitLabel,
  action,
  categories,
  initialValues,
  fixedChannel,
}: {
  trigger: (open: () => void) => ReactNode;
  heading: string;
  submitLabel: string;
  action: TransactionFormAction;
  categories: Category[];
  initialValues?: TransactionInitialValues;
  /** Editing never changes provenance — the channel a row was recorded
   * through (DASHBOARD/LINE_CHAT/SLIP_OCR/...) stays fixed on edit. */
  fixedChannel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initialValues?.type ?? "EXPENSE",
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  // Detect the pending:true->false transition rather than comparing `state`
  // to its previous value: a *successful* action here falls through to an
  // implicit `return undefined`, same as `initialState` — so `state` never
  // actually changes on success and a same-value comparison never trips.
  // The pending flag flipping off with no errors present is unambiguous
  // regardless of what the action returns. See the identical pattern (and
  // rationale) in GoalModal.tsx.
  const [wasPending, setWasPending] = useState(false);
  if (wasPending !== pending) {
    setWasPending(pending);
    if (wasPending && !pending && !state?.errors) {
      setOpen(false);
    }
  }

  const filteredCategories = categories.filter((c) => c.type === type);

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
              <div className="flex gap-2">
                <label
                  className={`flex-1 text-center py-2 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                    type === "EXPENSE"
                      ? "bg-rose-50 border-rose-200 text-rose-600"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="EXPENSE"
                    checked={type === "EXPENSE"}
                    onChange={() => setType("EXPENSE")}
                    className="sr-only"
                  />
                  รายจ่าย
                </label>
                <label
                  className={`flex-1 text-center py-2 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                    type === "INCOME"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="INCOME"
                    checked={type === "INCOME"}
                    onChange={() => setType("INCOME")}
                    className="sr-only"
                  />
                  รายรับ
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  รายการ
                </label>
                <input
                  name="title"
                  required
                  defaultValue={initialValues?.title}
                  placeholder="เช่น ค่าอาหารเที่ยง"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                {state?.errors?.title && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {state.errors.title[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  จำนวนเงิน (บาท)
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
                  <p className="text-[11px] text-rose-500 mt-1">
                    {state.errors.amount[0]}
                  </p>
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
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <input type="hidden" name="channel" value={fixedChannel ?? "DASHBOARD"} />

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

export function TransactionModal({ categories }: { categories: Category[] }) {
  return (
    <TransactionFormModal
      heading="เพิ่มรายการใหม่"
      submitLabel="บันทึกรายการ"
      action={createTransaction}
      categories={categories}
      trigger={(open) => (
        <button
          onClick={open}
          className="flex-1 sm:flex-none py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-sm transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus" />
          <span>บันทึกรายรับ/รายจ่าย</span>
        </button>
      )}
    />
  );
}
