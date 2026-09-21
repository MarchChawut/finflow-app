"use client";

import { useRef, useState, useTransition } from "react";
import { createAllocation, deleteAllocation, updateAllocation } from "@/lib/actions/goalAllocations";
import { formatBaht } from "@/lib/format";

export type Allocation = {
  id: string;
  label: string;
  type: "AMOUNT" | "PERCENT";
  value: string;
};

// AMOUNT is a flat baht figure; PERCENT is a percent of the goal's
// currentAmount (how much is saved right now, not the eventual target) —
// most people think of "how is what I've already saved split up", not "how
// will I eventually split a target I haven't reached yet".
function allocationBaht(a: Allocation, target: number) {
  return a.type === "AMOUNT" ? Number(a.value) : (Number(a.value) / 100) * target;
}

function amountFromPercent(percent: number, target: number): number {
  return (percent / 100) * target;
}

function percentFromAmount(amount: number, target: number): number {
  return target > 0 ? (amount / target) * 100 : 0;
}

// Shared by the add row and the edit row: shows a % box and a ฿ box side by
// side, keeps them in sync live off the goal's target amount, and carries
// the actual submitted type/value as hidden inputs — the browser collects
// hidden inputs into the enclosing <form>'s FormData same as any other
// field, so createAllocation/updateAllocation need no changes at all.
// Whichever box the user typed in last is what gets saved (not both,
// re-derived), so rounding from the live conversion never drifts from what
// they actually entered.
function AllocationAmountPercentFields({
  target,
  initialType,
  initialValue,
}: {
  target: number;
  initialType: "AMOUNT" | "PERCENT";
  initialValue: string;
}) {
  const [percent, setPercent] = useState(() =>
    initialValue === ""
      ? ""
      : initialType === "PERCENT"
        ? initialValue
        : percentFromAmount(Number(initialValue), target).toFixed(2),
  );
  const [amount, setAmount] = useState(() =>
    initialValue === ""
      ? ""
      : initialType === "AMOUNT"
        ? initialValue
        : amountFromPercent(Number(initialValue), target).toFixed(2),
  );
  const [activeType, setActiveType] = useState<"AMOUNT" | "PERCENT">(initialType);

  function handlePercentChange(v: string) {
    setPercent(v);
    setActiveType("PERCENT");
    const n = Number(v);
    setAmount(v === "" || Number.isNaN(n) ? "" : amountFromPercent(n, target).toFixed(2));
  }

  function handleAmountChange(v: string) {
    setAmount(v);
    setActiveType("AMOUNT");
    const n = Number(v);
    setPercent(v === "" || Number.isNaN(n) ? "" : percentFromAmount(n, target).toFixed(2));
  }

  // No wrapping div around the two boxes — the caller's own flex row (which
  // also holds the submit/save button, or in the edit row is its own
  // dedicated row) provides the flex context, so these need to be direct
  // flex items of it, not nested inside a div of their own that would
  // absorb the flex-1 sizing instead of passing it through.
  return (
    <>
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={percent}
          onChange={(e) => handlePercentChange(e.target.value)}
          placeholder="0"
          className="w-full px-2.5 py-1.5 pr-6 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
          %
        </span>
      </div>
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0"
          className="w-full px-2.5 py-1.5 pr-6 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
          ฿
        </span>
      </div>
      <input type="hidden" name="type" value={activeType} />
      <input type="hidden" name="value" value={activeType === "PERCENT" ? percent : amount} />
    </>
  );
}

export function GoalAllocations({
  goalId,
  currentAmount,
  allocations,
}: {
  goalId: string;
  currentAmount: string;
  allocations: Allocation[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Bumped after each successful add to remount AllocationAmountPercentFields
  // with blank state — formRef.current?.reset() below only resets the plain
  // native `label` input, not this controlled sub-component's own state.
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const current = Number(currentAmount);

  const totalBaht = allocations.reduce((sum, a) => sum + allocationBaht(a, current), 0);
  const totalPercent = current > 0 ? (totalBaht / current) * 100 : 0;
  const overCurrent = current > 0 && totalBaht > current + 0.01;

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await createAllocation(goalId, undefined, formData);
      formRef.current?.reset();
      setResetKey((k) => k + 1);
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      await updateAllocation(id, goalId, undefined, formData);
      setEditingId(null);
    });
  }

  function handleDelete(a: Allocation) {
    if (!confirm(`ลบสัดส่วน "${a.label}" ใช่ไหม?`)) return;
    startTransition(async () => {
      await deleteAllocation(a.id, goalId);
    });
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
      >
        <span>
          <i className="fa-solid fa-chart-pie mr-1.5" />
          จัดสัดส่วน{allocations.length > 0 ? ` (${allocations.length})` : ""}
        </span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-[10px]`} />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {allocations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {allocations.map((a) =>
                editingId === a.id ? (
                  <form
                    key={a.id}
                    action={(formData) => handleUpdate(a.id, formData)}
                    className="flex flex-col gap-1.5 bg-slate-50 rounded-lg p-2"
                  >
                    <input
                      name="label"
                      required
                      defaultValue={a.label}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                    <div className="flex items-center gap-1.5">
                      <AllocationAmountPercentFields target={current} initialType={a.type} initialValue={a.value} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={pending}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="flex-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                      >
                        บันทึก
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-slate-600 truncate">{a.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400">
                        {Math.round(
                          a.type === "PERCENT" ? Number(a.value) : percentFromAmount(allocationBaht(a, current), current),
                        )}
                        % · {formatBaht(allocationBaht(a, current))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        disabled={pending}
                        className="text-slate-300 hover:text-slate-600 transition-colors disabled:opacity-40"
                        title="แก้ไขสัดส่วนนี้"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        disabled={pending}
                        className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                        title="ลบสัดส่วนนี้"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  </div>
                ),
              )}
              <p
                className={`text-[11px] font-medium ${
                  overCurrent ? "text-rose-500" : "text-slate-400"
                }`}
              >
                รวม {formatBaht(totalBaht)} ({Math.round(totalPercent)}%)
                {overCurrent ? " — เกินยอดออมตอนนี้" : ""}
              </p>
            </div>
          )}

          <form ref={formRef} action={handleAdd} className="flex flex-col gap-1.5">
            <input
              name="label"
              required
              placeholder="ชื่อสัดส่วน เช่น ค่าเช่า"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="flex items-center gap-1.5">
              <AllocationAmountPercentFields
                key={resetKey}
                target={current}
                initialType="PERCENT"
                initialValue=""
              />
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-60"
              >
                <i className="fa-solid fa-plus" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
