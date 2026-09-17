"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateLineCredentials,
  disconnectLineCredentials,
  type LineCredentialsFormState,
} from "@/lib/actions/lineCredentials";

const initialState: LineCredentialsFormState = undefined;

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        configured ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}
    >
      <i className={`fa-solid ${configured ? "fa-circle-check" : "fa-circle-minus"}`} />
      {configured ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}
    </span>
  );
}

export function LineCredentialsForm({
  hasAccessToken,
  hasChannelSecret,
  liffId,
  liffIdQuickRecord,
}: {
  hasAccessToken: boolean;
  hasChannelSecret: boolean;
  liffId: string | null;
  liffIdQuickRecord: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateLineCredentials, initialState);
  const [disconnectPending, startDisconnectTransition] = useTransition();
  const [disconnected, setDisconnected] = useState(false);

  function handleDisconnect() {
    if (!confirm("ยกเลิกการเชื่อมต่อ LINE OA ของครอบครัวนี้? บอทจะหยุดทำงานจนกว่าจะกรอกใหม่")) return;
    startDisconnectTransition(async () => {
      await disconnectLineCredentials();
      setDisconnected(true);
    });
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <h3 className="font-bold text-slate-800 text-sm mb-1">LINE Official Account ของครอบครัวนี้</h3>
      <p className="text-xs text-slate-400 mb-4">
        กรอกค่าจาก LINE Developers Console (Messaging API channel ของโฮสเอง) — ให้บอททำงานเป็นส่วนตัว
        เฉพาะครอบครัวนี้เท่านั้น ไม่ปะปนกับครอบครัวอื่น
      </p>

      <form action={formAction} className="space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-500">Channel Access Token</label>
            <ConfiguredBadge configured={hasAccessToken} />
          </div>
          <input
            name="channelAccessToken"
            type="password"
            autoComplete="off"
            placeholder={hasAccessToken ? "•••••••••••••• (เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "วางค่าที่ Issue มาจาก Console"}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs"
          />
          {state?.errors?.channelAccessToken && (
            <p className="text-[11px] text-rose-500 mt-1">{state.errors.channelAccessToken[0]}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-500">Channel Secret</label>
            <ConfiguredBadge configured={hasChannelSecret} />
          </div>
          <input
            name="channelSecret"
            type="password"
            autoComplete="off"
            placeholder={hasChannelSecret ? "•••••••••••••• (เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "จากแท็บ Basic settings"}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs"
          />
          {state?.errors?.channelSecret && (
            <p className="text-[11px] text-rose-500 mt-1">{state.errors.channelSecret[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            LIFF ID (ผูกบัญชี — endpoint URL: /liff)
          </label>
          <input
            name="liffId"
            defaultValue={liffId ?? ""}
            placeholder="เช่น 1234567890-abcdEFGH"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            LIFF ID (บันทึกจดเงิน — endpoint URL: /liff/quick-record)
          </label>
          <input
            name="liffIdQuickRecord"
            defaultValue={liffIdQuickRecord ?? ""}
            placeholder="เช่น 1234567890-wxyzIJKL"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs"
          />
        </div>

        {state?.error && <p className="text-[11px] text-rose-500">{state.error}</p>}
        {state?.success && (
          <p className="text-[11px] text-emerald-600">บันทึกแล้ว ✅</p>
        )}
        {disconnected && (
          <p className="text-[11px] text-slate-500">ยกเลิกการเชื่อมต่อแล้ว</p>
        )}

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
            disabled={disconnectPending || (!hasAccessToken && !hasChannelSecret)}
            className="py-2 px-4 bg-white hover:bg-rose-50 disabled:opacity-40 text-rose-500 border border-rose-200 rounded-xl text-xs font-medium transition-all"
          >
            {disconnectPending ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
          </button>
        </div>
      </form>
    </div>
  );
}
