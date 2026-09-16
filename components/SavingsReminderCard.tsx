"use client";

import { useState, useTransition } from "react";
import { setSavingsReminderEnabled, sendSavingsReminderNow } from "@/lib/actions/appSettings";
import { Toggle } from "@/components/Toggle";

export function SavingsReminderCard({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [togglePending, startToggleTransition] = useTransition();
  const [sendPending, startSendTransition] = useTransition();
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(
    null,
  );

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    startToggleTransition(async () => {
      await setSavingsReminderEnabled(next);
    });
  }

  function handleSendNow() {
    setSendResult(null);
    startSendTransition(async () => {
      const result = await sendSavingsReminderNow();
      setSendResult(result);
    });
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            แจ้งเตือนออมเงินผ่าน LINE รายเดือน
          </h3>
          <p className="text-xs text-slate-400">
            ส่งสรุปความคืบหน้าเป้าหมายออมให้ทุกคนที่ผูกบัญชีไลน์ไว้
          </p>
        </div>
        <Toggle checked={checked} onChange={handleToggle} disabled={togglePending} />
      </div>

      <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
        <i className="fa-solid fa-triangle-exclamation mr-1" />
        เปิดสวิตช์นี้แค่กำหนด &ldquo;จะส่งไหม&rdquo; — ให้ส่งเองอัตโนมัติทุกเดือนจริง ๆ
        ต้องตั้ง cron job ภายนอกให้เรียก{" "}
        <code className="font-mono">/api/cron/savings-reminder</code> ตามรอบเวลา (เช่น cron
        บน NAS ตอน deploy จริง) ตอนนี้ยังต้องกด &ldquo;ส่งตอนนี้เลย&rdquo; เองก่อน
      </p>

      <button
        onClick={handleSendNow}
        disabled={sendPending}
        className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium text-sm transition-all"
      >
        {sendPending ? "กำลังส่ง..." : "ส่งตอนนี้เลย"}
      </button>

      {sendResult && (
        <p className="text-[11px] text-slate-500 mt-2">
          ส่งสำเร็จ {sendResult.sent} คน{sendResult.failed > 0 && ` (ล้มเหลว ${sendResult.failed} คน)`}
        </p>
      )}
    </div>
  );
}
