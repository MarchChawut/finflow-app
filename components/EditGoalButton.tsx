"use client";

import { updateGoal } from "@/lib/actions/goals";
import { GoalFormModal } from "@/components/GoalModal";

export function EditGoalButton({
  goal,
}: {
  goal: {
    id: string;
    title: string;
    targetAmount: string;
    currentAmount: string;
    color: string | null;
  };
}) {
  return (
    <GoalFormModal
      heading="แก้ไขเป้าหมาย"
      submitLabel="บันทึกการแก้ไข"
      action={updateGoal.bind(null, goal.id)}
      initialValues={{
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        color:
          (goal.color as
            | "purple"
            | "emerald"
            | "pink"
            | "amber"
            | "sky"
            | "rose"
            | "teal"
            | null) ?? undefined,
      }}
      trigger={(open) => (
        <button
          onClick={open}
          title="แก้ไขเป้าหมาย"
          className="text-slate-300 hover:text-slate-600 transition-colors"
        >
          <i className="fa-solid fa-pen text-xs" />
        </button>
      )}
    />
  );
}
