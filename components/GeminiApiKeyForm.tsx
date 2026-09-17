"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateGeminiApiKey,
  disconnectGeminiApiKey,
  type GeminiCredentialsFormState,
} from "@/lib/actions/geminiCredentials";

const initialState: GeminiCredentialsFormState = undefined;

export function GeminiApiKeyForm({ hasApiKey }: { hasApiKey: boolean }) {
  const [state, formAction, pending] = useActionState(updateGeminiApiKey, initialState);
  const [disconnectPending, startDisconnectTransition] = useTransition();
  const [disconnected, setDisconnected] = useState(false);

  function handleDisconnect() {
    if (!confirm("ยกเลิกการเชื่อมต่อ Gemini API key ของครอบครัวนี้? AI โค้ชจะใช้งานไม่ได้จนกว่าจะกรอกใหม่")) return;
    startDisconnectTransition(async () => {
      await disconnectGeminiApiKey();
      setDisconnected(true);
    });
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <h3 className="font-bold text-slate-800 text-sm mb-1">AI โค้ช (Gemini)</h3>
      <p className="text-xs text-slate-400 mb-4">
        กรอก API key ของตัวเองจาก{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-500 underline"
        >
          Google AI Studio
        </a>{" "}
        — ใช้งานและจ่ายค่าใช้จ่ายของครอบครัวนี้เอง ไม่ปะปนกับครอบครัวอื่น
      </p>

      <form action={formAction} className="space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-500">Gemini API Key</label>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                hasApiKey ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <i className={`fa-solid ${hasApiKey ? "fa-circle-check" : "fa-circle-minus"}`} />
              {hasApiKey ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}
            </span>
          </div>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={hasApiKey ? "•••••••••••••• (เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "AIza..."}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs"
          />
          {state?.errors?.apiKey && (
            <p className="text-[11px] text-rose-500 mt-1">{state.errors.apiKey[0]}</p>
          )}
        </div>

        {state?.error && <p className="text-[11px] text-rose-500">{state.error}</p>}
        {state?.success && <p className="text-[11px] text-emerald-600">บันทึกแล้ว ✅</p>}
        {disconnected && <p className="text-[11px] text-slate-500">ยกเลิกการเชื่อมต่อแล้ว</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-xs font-medium transition-all"
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnectPending || !hasApiKey}
            className="py-2 px-4 bg-white hover:bg-rose-50 disabled:opacity-40 text-rose-500 border border-rose-200 rounded-xl text-xs font-medium transition-all"
          >
            {disconnectPending ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
          </button>
        </div>
      </form>
    </div>
  );
}
