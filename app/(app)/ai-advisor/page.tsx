import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";

export default async function AiAdvisorPage() {
  const session = await getSession();
  const user = session!.user;

  return (
    <>
      <Header
        title="AI Financial Coach"
        subtitle="โค้ชการเงินส่วนตัวผ่าน LINE AI"
        user={user}
      />
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-soft text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mb-4">
          <i className="fa-solid fa-wand-magic-sparkles" />
        </div>
        <h3 className="font-bold text-slate-800 mb-1">เร็ว ๆ นี้ — Phase 5</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          ที่ปรึกษาการเงิน AI ขับเคลื่อนด้วย Gemini จะมาในเฟสถัดไปตาม{" "}
          <code className="font-mono">tasks/plan.md</code>
        </p>
      </div>
    </>
  );
}
