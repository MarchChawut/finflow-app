"use client";

import { useState } from "react";
import { GoalCard, type Goal } from "@/components/GoalCard";

// Goals never paginate (see lib/data/goals.ts — no .limit()), so the tab
// toggle just filters the already-fetched array client-side rather than
// round-tripping to the server like TransactionsTable's tab does.
export function GoalsGrid({ goals }: { goals: Goal[] }) {
  const [tab, setTab] = useState<"personal" | "family">("family");
  const wantedVisibility = tab === "personal" ? "PERSONAL" : "FAMILY";
  const filtered = goals.filter((g) => g.visibility === wantedVisibility);

  return (
    <>
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab("family")}
          className={`flex-1 sm:flex-none sm:px-6 text-center py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "family"
              ? "bg-pink-50 border-pink-200 text-pink-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ครอบครัว
        </button>
        <button
          type="button"
          onClick={() => setTab("personal")}
          className={`flex-1 sm:flex-none sm:px-6 text-center py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "personal"
              ? "bg-pink-50 border-pink-200 text-pink-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ส่วนตัว
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 col-span-full text-center py-12">
            {tab === "personal"
              ? "ยังไม่มีกระเป๋าส่วนตัว — สร้างกระเป๋าแล้วเลือก \"ส่วนตัว\" ได้เลย"
              : "ยังไม่มีกระเป๋าของครอบครัว — เริ่มสร้างกระเป๋าแรกได้เลย"}
          </p>
        )}
      </div>
    </>
  );
}
