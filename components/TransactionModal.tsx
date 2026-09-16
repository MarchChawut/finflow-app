"use client";

import { useState, type ReactNode } from "react";
import { createTransaction, type TransactionFormState } from "@/lib/actions/transactions";
import { FormModal } from "@/components/FormModal";

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
// "edit a transaction" (EditTransactionButton.tsx) — see
// components/FormModal.tsx for the modal shell itself.
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
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initialValues?.type ?? "EXPENSE",
  );

  const filteredCategories = categories.filter((c) => c.type === type);

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
        </>
      )}
    </FormModal>
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
