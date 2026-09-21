"use client";

// Shared "มองเห็นได้โดย" (ส่วนตัว/ครอบครัว) radio pair, used by both the
// wallet form (GoalModal.tsx) and the transaction form (TransactionModal.tsx)
// — same peer-checked pattern as GoalModal.tsx's color swatches, so no JS
// state is needed for something this form never reads back client-side.
const VISIBILITY_OPTIONS = [
  { value: "FAMILY", label: "ครอบครัว", icon: "fa-people-roof" },
  { value: "PERSONAL", label: "ส่วนตัว", icon: "fa-lock" },
] as const;

export function VisibilityField({
  defaultValue = "FAMILY",
}: {
  defaultValue?: "PERSONAL" | "FAMILY";
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        มองเห็นได้โดย
      </label>
      <div className="flex gap-2">
        {VISIBILITY_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="sr-only peer"
            />
            <span className="block text-center py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold transition-all peer-checked:bg-purple-50 peer-checked:border-purple-200 peer-checked:text-purple-600">
              <i className={`fa-solid ${opt.icon} mr-1.5`} />
              {opt.label}
            </span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        &quot;ส่วนตัว&quot; จะมองเห็นได้เฉพาะคุณเท่านั้น
      </p>
    </div>
  );
}
