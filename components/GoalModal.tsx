"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createGoal, type GoalFormState } from "@/lib/actions/goals";

// Tailwind scans source for literal class strings, so these must be spelled
// out in full rather than built with `bg-${color}-400` template strings.
const COLOR_SWATCHES = {
  purple: "bg-purple-400",
  emerald: "bg-emerald-400",
  pink: "bg-pink-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
  teal: "bg-teal-400",
} as const;
const COLORS = Object.keys(COLOR_SWATCHES) as (keyof typeof COLOR_SWATCHES)[];
const initialState: GoalFormState = undefined;

type GoalFormAction = (
  prevState: GoalFormState,
  formData: FormData,
) => Promise<GoalFormState> | GoalFormState;

type GoalInitialValues = {
  title?: string;
  targetAmount?: string;
  color?: keyof typeof COLOR_SWATCHES;
  currentAmount?: string;
};

// Shared shell for both "create a goal" (GoalModal, below) and "edit a goal"
// (EditGoalButton.tsx) — same form, different bound server action and
// starting values, so the two never drift apart.
export function GoalFormModal({
  trigger,
  heading,
  submitLabel,
  action,
  initialValues,
}: {
  trigger: (open: () => void) => ReactNode;
  heading: string;
  submitLabel: string;
  action: GoalFormAction;
  initialValues?: GoalInitialValues;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);

  // Detect the pending:true->false transition rather than comparing `state`
  // to its previous value: a *successful* action here falls through to an
  // implicit `return undefined`, same as `initialState` — so `state` never
  // actually changes on success and a same-value comparison never trips.
  // The pending flag flipping off with no errors present is unambiguous
  // regardless of what the action returns. See the identical pattern (and
  // rationale) in TransactionModal.tsx.
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
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ชื่อเป้าหมาย
                </label>
                <input
                  name="title"
                  required
                  defaultValue={initialValues?.title}
                  placeholder="เช่น ออมเงินเที่ยวญี่ปุ่น"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
                {state?.errors?.title && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {state.errors.title[0]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  เป้าหมาย (บาท)
                </label>
                <input
                  name="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={initialValues?.targetAmount}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
                {state?.errors?.targetAmount && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {state.errors.targetAmount[0]}
                  </p>
                )}
              </div>

              {/* Only shown when editing an existing goal — a brand-new goal
                  always starts at 0 by construction, so this field would be
                  meaningless (and confusing) on the create flow. This is the
                  fix path for a wrong contribution (by hand or via the LINE
                  savings-transfer feature) or resetting a goal to start over. */}
              {initialValues && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    ยอดออมตอนนี้ (บาท)
                  </label>
                  <input
                    name="currentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={initialValues?.currentAmount}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    แก้ตรงนี้ได้ถ้ายอดผิด หรือใส่ 0 เพื่อเริ่มออมใหม่
                  </p>
                  {state?.errors?.currentAmount && (
                    <p className="text-[11px] text-rose-500 mt-1">
                      {state.errors.currentAmount[0]}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  สี
                </label>
                <div className="flex gap-2">
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
                className="w-full py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white font-medium transition-all"
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

export function GoalModal() {
  return (
    <GoalFormModal
      heading="เพิ่มเป้าหมายการออม"
      submitLabel="สร้างเป้าหมาย"
      action={createGoal}
      trigger={(open) => (
        <button
          onClick={open}
          className="py-2 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs shadow-md shadow-pink-200 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus" /> เพิ่มเป้าหมายออมเงิน
        </button>
      )}
    />
  );
}
