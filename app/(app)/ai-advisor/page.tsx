import Link from "next/link";
import { getSession } from "@/lib/session";
import { getFamilyLineSettings } from "@/lib/data/families";
import { Header } from "@/components/Header";
import { CoachForm } from "@/components/CoachForm";

export default async function AiAdvisorPage() {
  const [session, { hasGeminiApiKey }] = await Promise.all([
    getSession(),
    getFamilyLineSettings(),
  ]);
  const user = session!.user;

  return (
    <>
      <Header
        title="AI Financial Coach"
        subtitle="โค้ชการเงินส่วนตัวผ่าน LINE AI"
        user={user}
      />

      {hasGeminiApiKey ? (
        <CoachForm />
      ) : (
        <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-soft text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mb-4">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </div>
          {user.role === "ADMIN" ? (
            <>
              <h3 className="font-bold text-slate-800 mb-1">ยังไม่ได้ตั้งค่า Gemini API key</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                ที่ปรึกษาการเงิน AI ขับเคลื่อนด้วย Gemini — กรอก API key ของครอบครัวนี้ที่หน้าตั้งค่าก่อน
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium transition-all"
              >
                <i className="fa-solid fa-gear" /> ไปที่หน้าตั้งค่า
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-bold text-slate-800 mb-1">ฟีเจอร์นี้ยังไม่เปิดใช้งาน</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                กรุณาติดต่อแอดมินของครอบครัวให้ตั้งค่า Gemini API key ที่หน้าตั้งค่าก่อน
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
