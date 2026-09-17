import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { getLineBindingStatus } from "@/lib/data/line";
import { getCategories } from "@/lib/data/transactions";
import { getUsagePeriod, getSavingsReminderEnabled } from "@/lib/data/appSettings";
import { getFamilyLineSettings } from "@/lib/data/families";
import { Header } from "@/components/Header";
import { CopyButton } from "@/components/CopyButton";
import { LineConnectionToggle } from "@/components/LineConnectionToggle";
import { LineCredentialsForm } from "@/components/LineCredentialsForm";
import { GeminiApiKeyForm } from "@/components/GeminiApiKeyForm";
import { SetupRichMenuButton } from "@/components/SetupRichMenuButton";
import { CategoriesManager } from "@/components/CategoriesManager";
import { UsagePeriodCard } from "@/components/UsagePeriodCard";
import { SavingsReminderCard } from "@/components/SavingsReminderCard";

export default async function SettingsPage() {
  const [session, { lineUserId }, requestHeaders, categories, usagePeriod, reminderEnabled, lineSettings] =
    await Promise.all([
      getSession(),
      getLineBindingStatus(),
      headers(),
      getCategories(),
      getUsagePeriod(),
      getSavingsReminderEnabled(),
      getFamilyLineSettings(),
    ]);
  const user = session!.user;

  // Derived from the actual incoming request rather than a fixed env var,
  // so it's correct whether this is running on localhost, a cloudflared
  // quick tunnel, or the real deployment. The webhookSlug identifies this
  // family's channel to the webhook route before any signature is checked.
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:4005";
  const webhookUrl = `${proto}://${host}/api/line/webhook/${lineSettings.webhookSlug}`;

  return (
    <>
      <Header
        title="ตั้งค่า"
        subtitle="หมวดหมู่การเงิน ช่วงเวลาใช้งาน สมาชิกครอบครัว และการเชื่อมต่อ LINE OA"
        user={user}
      />

      <div className="space-y-6 max-w-2xl">
        <CategoriesManager categories={categories} />

        <UsagePeriodCard expiresAt={usagePeriod.expiresAt} />

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <h3 className="font-bold text-slate-800 text-sm mb-1">ข้อมูลรายรับ-รายจ่าย</h3>
          <p className="text-xs text-slate-400 mb-4">
            ดาวน์โหลดรายการทั้งหมดเป็นไฟล์ CSV เปิดใน Excel/Google Sheets ได้
          </p>
          <a
            href="/api/export/transactions"
            className="inline-flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-all"
          >
            <i className="fa-solid fa-file-arrow-down" /> ส่งออก CSV
          </a>
        </div>

        <div className="pt-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            LINE Official Account
          </h2>
        </div>

        <LineCredentialsForm
          hasAccessToken={lineSettings.hasAccessToken}
          hasChannelSecret={lineSettings.hasChannelSecret}
          liffId={lineSettings.liffId}
          liffIdQuickRecord={lineSettings.liffIdQuickRecord}
        />

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            Webhook URL สำหรับใส่ใน LINE Developers Console
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Messaging API channel → Webhook settings → Webhook URL
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-mono text-[11px]"
            />
            <CopyButton value={webhookUrl} />
          </div>
          {host.includes("localhost") && (
            <p className="text-[11px] text-amber-600 mt-2">
              <i className="fa-solid fa-triangle-exclamation mr-1" />
              LINE ต้องยิง webhook มาจากอินเทอร์เน็ตจริง — URL แบบ localhost นี้ใช้กับ LINE
              Console ไม่ได้ ต้องเปิด tunnel ก่อน (เช่น{" "}
              <code className="font-mono">cloudflared tunnel --url http://localhost:4005</code>)
              แล้วใช้ URL ที่ได้แทน
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">บัญชีไลน์ของคุณ</h3>
              <p className="text-xs text-slate-400">
                ผูกบัญชีไลน์เพื่อบันทึกรายรับ-รายจ่ายผ่านแชตได้
              </p>
            </div>
            <LineConnectionToggle connected={Boolean(lineUserId)} />
          </div>
        </div>

        <SavingsReminderCard enabled={reminderEnabled} />

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Rich Menu</h3>
          <p className="text-xs text-slate-400 mb-4">
            สร้างเมนูด่วน 6 ปุ่ม (บันทึกจดเงิน / ภาพรวมบัญชี / บัญชีครอบครัว / เป้าหมายการออม /
            เครื่องมือการเงิน / AI โค้ช) ให้แสดงใต้ช่องแชตใน LINE โดยอัตโนมัติ — รูปภาพสร้างจากโค้ด
            ยังไม่ได้ออกแบบเอง ปรับได้ทีหลังที่{" "}
            <code className="font-mono">lib/line/richMenuImage.ts</code>
          </p>
          <SetupRichMenuButton />
        </div>

        <div className="pt-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            AI โค้ช
          </h2>
        </div>

        <GeminiApiKeyForm hasApiKey={lineSettings.hasGeminiApiKey} />
      </div>
    </>
  );
}
