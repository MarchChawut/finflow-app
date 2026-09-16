"use client";

import { useRef, useTransition } from "react";
import { contributeToGoal, deleteGoal } from "@/lib/actions/goals";
import { formatBaht } from "@/lib/format";
import { EditGoalButton } from "@/components/EditGoalButton";

const COLOR_MAP: Record<string, { bar: string; text: string; bg: string }> = {
  purple: { bar: "bg-purple-400", text: "text-purple-600", bg: "bg-purple-50" },
  emerald: { bar: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" },
  pink: { bar: "bg-pink-400", text: "text-pink-600", bg: "bg-pink-50" },
  amber: { bar: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50" },
  sky: { bar: "bg-sky-400", text: "text-sky-600", bg: "bg-sky-50" },
  rose: { bar: "bg-rose-400", text: "text-rose-600", bg: "bg-rose-50" },
  teal: { bar: "bg-teal-400", text: "text-teal-600", bg: "bg-teal-50" },
};

export function GoalCard({
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
  const formRef = useRef<HTMLFormElement>(null);
  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const tone = COLOR_MAP[goal.color ?? "purple"] ?? COLOR_MAP.purple;

  const contribute = contributeToGoal.bind(null, goal.id);
  const [deleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`ลบเป้าหมาย "${goal.title}" ใช่ไหม? ประวัติเงินที่ออมไว้จะหายไปด้วย`)) return;
    // Fade while pending; the card actually disappears once deleteGoal's
    // revalidatePath("/goals") re-fetches the (now shorter) goals list —
    // same pattern as TransactionsTable's row delete.
    startDeleteTransition(async () => {
      await deleteGoal(goal.id);
    });
  }

  return (
    <div
      className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col gap-4 transition-opacity ${
        deleting ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-2xl ${tone.bg} ${tone.text} flex items-center justify-center text-lg`}>
          <i className="fa-solid fa-piggy-bank" />
        </div>
        {/* Quiet by design — no background/border, only a hover color change,
            so these don't compete with the title/amount/progress above. */}
        <div className="flex items-center gap-3 pt-1">
          <EditGoalButton goal={goal} />
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="ลบเป้าหมาย"
            className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
          >
            <i className="fa-solid fa-trash-can text-xs" />
          </button>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm mb-1">{goal.title}</h4>
        <p className="text-xs text-slate-400">
          {formatBaht(current)} จาก {formatBaht(target)}
        </p>
      </div>
      <div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className={`${tone.bar} h-full rounded-full`} style={{ width: `${percent}%` }} />
        </div>
        <p className={`text-[11px] font-semibold ${tone.text} mt-1`}>{percent}%</p>
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          await contribute(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2"
      >
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="เติมเงิน (บาท)"
          className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <button
          type="submit"
          className="shrink-0 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-all"
        >
          <i className="fa-solid fa-plus" />
        </button>
      </form>
    </div>
  );
}
