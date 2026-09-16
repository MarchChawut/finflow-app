"use client";

import { useActionState, useEffect, useState } from "react";
import { createTransaction, type TransactionFormState } from "@/lib/actions/transactions";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

const initialState: TransactionFormState = undefined;

export function QuickRecordForm({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [state, formAction, pending] = useActionState(createTransaction, initialState);
  const filteredCategories = categories.filter((c) => c.type === type);

  // Best-effort: close the LIFF in-app browser window after a successful
  // save, so "quick record" actually feels quick (tap → fill → done, back to
  // the chat). If LIFF isn't available/initialized for any reason, just
  // leave the success message on screen — never block on this.
  useEffect(() => {
    if (!state?.success) return;
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID_QUICK_RECORD;
    if (!liffId) return;

    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!cancelled && liff.isInClient()) {
          liff.closeWindow();
        }
      } catch {
        // Not running inside LINE / LIFF unavailable — nothing to do.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.success]);

  if (state?.success) {
    return (
      <p className="text-sm text-emerald-600 font-medium text-center">
        <i className="fa-solid fa-circle-check mr-1" /> บันทึกสำเร็จแล้ว
      </p>
    );
  }

  return (
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
        <label className="block text-xs font-medium text-slate-500 mb-1">รายการ</label>
        <input
          name="title"
          required
          placeholder="เช่น กาแฟ"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        {state?.errors?.title && (
          <p className="text-[11px] text-rose-500 mt-1">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">จำนวนเงิน (บาท)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        {state?.errors?.amount && (
          <p className="text-[11px] text-rose-500 mt-1">{state.errors.amount[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">หมวดหมู่</label>
        <select
          name="categoryId"
          defaultValue=""
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

      <input type="hidden" name="channel" value="LIFF_FORM" />

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium transition-all"
      >
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
