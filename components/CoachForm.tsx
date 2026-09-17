"use client";

import { useActionState } from "react";
import { getCoachAdvice, type CoachFormState } from "@/lib/actions/coach";

const initialState: CoachFormState = undefined;

export function CoachForm() {
  const [state, formAction, pending] = useActionState(getCoachAdvice, initialState);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-950 via-indigo-900 to-slate-900 p-8 rounded-3xl shadow-soft-lg">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 text-purple-200 mb-4">
          <i className="fa-solid fa-sparkles" /> Powered by Gemini AI (Google)
        </span>
        <h3 className="text-white font-bold mb-1">โค้ชการเงินส่วนตัวผ่าน AI</h3>
        <p className="text-xs text-purple-200/70 mb-5">
          ถามคำถามเกี่ยวกับการเงินของครอบครัว วิเคราะห์จากข้อมูลจริงของคุณ
        </p>

        <form action={formAction} className="space-y-3">
          <textarea
            name="question"
            required
            maxLength={500}
            rows={3}
            placeholder='เช่น "แนะนำวิธีลดค่าอาหาร 20% ในเดือนนี้ หน่อย"'
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-white placeholder:text-purple-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          {state?.errors?.question && (
            <p className="text-[11px] text-rose-300">{state.errors.question[0]}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-2xl bg-white hover:bg-purple-50 disabled:opacity-60 text-purple-900 font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-wand-magic-sparkles" />
            {pending ? "กำลังวิเคราะห์..." : "วิเคราะห์การเงิน"}
          </button>
        </form>
      </div>

      {pending && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft text-sm text-slate-500">
          🤖 กำลังประมวลผลข้อมูลการเงินด้วย Gemini AI...
        </div>
      )}

      {!pending && state?.error && (
        <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-soft">
          <p className="text-sm text-rose-500">{state.error}</p>
        </div>
      )}

      {!pending && state?.advice && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <h4 className="font-bold text-slate-800 text-sm mb-1">บทวิเคราะห์จาก FinFlow AI Coach</h4>
          <p className="text-xs text-slate-400 mb-4">คำแนะนำจากการคำนวณรายรับ-รายจ่ายจริงของครอบครัวคุณ</p>
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {state.advice}
          </div>
        </div>
      )}
    </div>
  );
}
