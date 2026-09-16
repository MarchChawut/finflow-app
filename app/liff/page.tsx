import Link from "next/link";
import { getSession } from "@/lib/session";
import { LiffBinder } from "@/components/LiffBinder";

// /liff is excluded from proxy.ts's matcher (it's opened inside LINE's
// in-app browser, which is a separate cookie/session context from the
// user's regular browser) — so this page must gate itself rather than
// relying on Proxy.
export default async function LiffPage() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft-lg border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-600 mb-6">
            กรุณาเข้าสู่ระบบก่อนเพื่อผูกบัญชีไลน์กับบัญชี FinFlow ของคุณ
          </p>
          <Link
            href="/login?callbackUrl=/liff"
            className="inline-block py-2.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft-lg border border-slate-100 p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-md mb-4">
          <i className="fa-brands fa-line" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 mb-1">ผูกบัญชีไลน์</h1>
        <p className="text-xs text-slate-400 mb-6">
          เชื่อมบัญชีไลน์ของคุณกับ {session.user.email} เพื่อบันทึกรายรับ-รายจ่ายผ่านแชตได้
        </p>
        <LiffBinder />
      </div>
    </div>
  );
}
