"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unbindLineAccount } from "@/lib/actions/line";
import { Toggle } from "@/components/Toggle";

export function LineConnectionToggle({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    if (connected) {
      startTransition(async () => {
        await unbindLineAccount();
      });
    } else {
      router.push("/liff");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium ${connected ? "text-emerald-600" : "text-slate-400"}`}>
        {connected ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
      </span>
      <Toggle checked={connected} onChange={handleToggle} disabled={pending} />
    </div>
  );
}
