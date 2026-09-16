"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createCategory, type CategoryFormState } from "@/lib/actions/categories";

// Same literal-class-string reasoning as GoalModal.tsx's COLOR_SWATCHES —
// Tailwind scans source text, not runtime template strings.
const COLOR_SWATCHES = {
  "#A78BFA": "bg-[#A78BFA]",
  "#7DD3FC": "bg-[#7DD3FC]",
  "#F9A8D4": "bg-[#F9A8D4]",
  "#34D399": "bg-[#34D399]",
  "#FBBF24": "bg-[#FBBF24]",
  "#F87171": "bg-[#F87171]",
} as const;
const COLORS = Object.keys(COLOR_SWATCHES) as (keyof typeof COLOR_SWATCHES)[];
const initialState: CategoryFormState = undefined;

type CategoryFormAction = (
  prevState: CategoryFormState,
  formData: FormData,
) => Promise<CategoryFormState> | CategoryFormState;

type CategoryInitialValues = {
  name?: string;
  type?: "INCOME" | "EXPENSE";
  color?: string;
};

// Shared shell for both "create a category" (CategoryModal, below) and "edit
// a category" (EditCategoryButton.tsx) — same reasoning as
// GoalModal.tsx/TransactionModal.tsx's identical split.
export function CategoryFormModal({
  trigger,
  heading,
  submitLabel,
  action,
  initialValues,
}: {
  trigger: (open: () => void) => ReactNode;
  heading: string;
  submitLabel: string;
  action: CategoryFormAction;
  initialValues?: CategoryInitialValues;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initialValues?.type ?? "EXPENSE",
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  // See TransactionModal.tsx/GoalModal.tsx for the rationale (comparing
  // `state` to its previous value doesn't detect success here, since a
  // successful call falls through to an implicit `undefined` return).
  const [wasPending, setWasPending] = useState(false);
  if (wasPending !== pending) {
    setWasPending(pending);
    if (wasPending && !pending && !state?.errors) {
      setOpen(false);
    }
  }

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
                  ชื่อหมวดหมู่
                </label>
                <input
                  name="name"
                  required
                  defaultValue={initialValues?.name}
                  placeholder="เช่น อาหาร & เครื่องดื่ม"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                {state?.errors?.name && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  สี
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={c}
                        defaultChecked={(initialValues?.color ?? COLORS[0]) === c}
                        className="sr-only peer"
                      />
                      <span
                        className={`block w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-slate-800 ${COLOR_SWATCHES[c]}`}
                      />
                    </label>
                  ))}
                </div>
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

export function CategoryModal() {
  return (
    <CategoryFormModal
      heading="เพิ่มหมวดหมู่"
      submitLabel="สร้างหมวดหมู่"
      action={createCategory}
      trigger={(open) => (
        <button
          onClick={open}
          className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-md shadow-purple-200 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> เพิ่มหมวดหมู่
        </button>
      )}
    />
  );
}
