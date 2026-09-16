"use client";

import { useState, useTransition } from "react";
import { setupRichMenu } from "@/lib/actions/line";

export function SetupRichMenuButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await setupRichMenu();
      setResult(res ?? null);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="py-2 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white rounded-xl text-xs font-medium transition-all"
      >
        {pending ? "กำลังตั้งค่า..." : "ตั้งค่า Rich Menu"}
      </button>
      {result?.error && <p className="text-[11px] text-rose-500 mt-2">{result.error}</p>}
      {result?.success && (
        <p className="text-[11px] text-emerald-600 mt-2">
          ตั้งค่าสำเร็จ ✅ เปิดแอป LINE แล้วดูเมนูด้านล่างแชตได้เลย
        </p>
      )}
    </div>
  );
}
