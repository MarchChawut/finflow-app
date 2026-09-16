import Link from "next/link";
import { getSession } from "@/lib/session";
import { getCategories } from "@/lib/data/transactions";
import { QuickRecordForm } from "@/components/QuickRecordForm";

// Same reasoning as app/liff/page.tsx: excluded from proxy.ts's matcher
// (LINE's in-app browser is a separate cookie/session context), so this page
// gates itself.
export default async function QuickRecordPage() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft-lg border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-600 mb-6">
            กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกรายรับ-รายจ่าย
          </p>
          <Link
            href="/login?callbackUrl=/liff/quick-record"
            className="inline-block py-2.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  const categories = await getCategories();

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft-lg border border-slate-100 p-6">
        <h1 className="text-lg font-bold text-slate-800 mb-1 text-center">บันทึกจดเงิน</h1>
        <p className="text-xs text-slate-400 mb-6 text-center">จดรายรับ-รายจ่ายแบบด่วน</p>
        <QuickRecordForm categories={categories} />
      </div>
    </div>
  );
}
