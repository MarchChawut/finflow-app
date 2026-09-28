"use client";

import { useTransition } from "react";
import {
  clearPeriodBalanceToSavings,
  markSalaryReceived,
  type ClearPeriodBalanceState,
} from "@/lib/actions/payPeriod";
import { FormModal } from "@/components/FormModal";
import { formatBaht, formatDateTime } from "@/lib/format";

type Goal = { id: string; title: string };

const initialState: ClearPeriodBalanceState = undefined;

function ClearBalanceModal({ goals, leftover }: { goals: Goal[]; leftover: number }) {
  return (
    <FormModal
      heading="เคลียร์ยอดคงเหลือเข้าเงินออม"
      submitLabel="เคลียร์เข้าเงินออม"
      action={clearPeriodBalanceToSavings}
      initialState={initialState}
      trigger={(open) => (
        <button
          onClick={open}
          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-piggy-bank" /> เคลียร์ยอดคงเหลือเข้าเงินออม
        </button>
      )}
    >
      {(state) => (
        <div>
          <p className="text-xs text-slate-500 mb-3">
            ยอดคงเหลือตอนนี้: <span className="font-semibold text-slate-700">{formatBaht(leftover)}</span>
            {leftover <= 0 && " — ยังไม่มีอะไรให้เคลียร์"}
          </p>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            โอนเข้ากระเป๋าออม
          </label>
          <select
            name="goalId"
            required
            defaultValue=""
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="" disabled>
              เลือกกระเป๋าออม
            </option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          {state?.message && (
            <p className="text-[11px] text-rose-500 mt-1">{state.message}</p>
          )}
        </div>
      )}
    </FormModal>
  );
}

export function PayPeriodCard({
  periodStart,
  periodIncome,
  periodSpending,
  leftover,
  goals,
}: {
  periodStart: Date | null;
  periodIncome: number;
  periodSpending: number;
  leftover: number;
  goals: Goal[];
}) {
  const [pending, startTransition] = useTransition();

  function handleMarkSalaryReceived() {
    if (
      !confirm(
        "เริ่มรอบเงินเดือนใหม่จากวันนี้ใช่ไหม? (ยอดคงเหลือปัจจุบันจะยังอยู่เหมือนเดิม แค่ตัวเลขรายรับ-รายจ่ายรอบนี้จะเริ่มนับใหม่ และรายจ่ายประจำเดือนทุกรายการจะกลับเป็นสถานะยังไม่จ่าย)",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await markSalaryReceived();
    });
  }

  return (
    <div
      className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-soft transition-opacity ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base">
            ยอดคงเหลือรอบเงินเดือนนี้
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {periodStart
              ? `นับตั้งแต่เงินเดือนเข้า ${formatDateTime(periodStart)}`
              : 'ยังไม่เคยเริ่มรอบ — กด "เงินเดือนเข้าวันนี้" เพื่อเริ่ม'}
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-3">
            {formatBaht(leftover)}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>รายรับรอบนี้ {formatBaht(periodIncome)}</span>
            <span>รายจ่ายรอบนี้ {formatBaht(periodSpending)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <button
            onClick={handleMarkSalaryReceived}
            disabled={pending}
            className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-md shadow-purple-200 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            <i className="fa-solid fa-money-bill-transfer" /> เงินเดือนเข้าวันนี้
          </button>

          {goals.length === 0 ? (
            <a
              href="/goals"
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              สร้างกระเป๋าออมก่อนเพื่อเคลียร์ยอดคงเหลือ
            </a>
          ) : (
            <ClearBalanceModal goals={goals} leftover={leftover} />
          )}
        </div>
      </div>
    </div>
  );
}
