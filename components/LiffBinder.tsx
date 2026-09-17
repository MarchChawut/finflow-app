"use client";

import { useEffect, useState } from "react";
import { bindLineAccount } from "@/lib/actions/line";

type Status =
  | { step: "initializing" }
  | { step: "success" }
  | { step: "error"; message: string };

export function LiffBinder({ liffId }: { liffId: string | null }) {
  const [status, setStatus] = useState<Status>({ step: "initializing" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!liffId) {
        setStatus({
          step: "error",
          message: "ยังไม่ได้ตั้งค่า LIFF ID สำหรับครอบครัวนี้ — ให้แอดมินตั้งค่าที่หน้าตั้งค่าก่อน",
        });
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // Redirects to LINE Login; this component remounts on return.
          liff.login();
          return;
        }

        // Server verifies this signed ID token against LINE directly (see
        // lib/line/verifyIdToken.ts) rather than trusting a client-supplied
        // user id — liff.getProfile().userId is plain client-reported data
        // that any authenticated caller could substitute for anyone else's.
        const idToken = liff.getIDToken();
        if (!idToken) {
          setStatus({
            step: "error",
            message: "ไม่พบข้อมูลยืนยันตัวตนจากไลน์ กรุณาลองใหม่ในแอป LINE",
          });
          return;
        }
        const result = await bindLineAccount(idToken);
        if (cancelled) return;

        if (result?.error) {
          setStatus({ step: "error", message: result.error });
        } else {
          setStatus({ step: "success" });
        }
      } catch (err) {
        if (cancelled) return;
        setStatus({
          step: "error",
          message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (status.step === "initializing") {
    return <p className="text-xs text-slate-400">กำลังเชื่อมต่อกับ LINE...</p>;
  }

  if (status.step === "success") {
    return (
      <p className="text-sm text-emerald-600 font-medium">
        <i className="fa-solid fa-circle-check mr-1" /> ผูกบัญชีไลน์สำเร็จแล้ว
      </p>
    );
  }

  return <p className="text-xs text-rose-500">{status.message}</p>;
}
