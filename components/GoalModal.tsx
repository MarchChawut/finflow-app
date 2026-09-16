"use client";

import type { ReactNode } from "react";
import { createGoal, type GoalFormState } from "@/lib/actions/goals";
import { FormModal } from "@/components/FormModal";

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
// (EditGoalButton.tsx) — see components/FormModal.tsx for the modal shell
// itself. Keeps this app's one exception to the usual purple accent (pink,
// matching the goals feature's own color throughout the app).
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
  return (
    <FormModal
      trigger={trigger}
      heading={heading}
      submitLabel={submitLabel}
      action={action}
      initialState={initialState}
      accent="pink"
    >
      {(state) => (
        <>
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
        </>
      )}
    </FormModal>
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
