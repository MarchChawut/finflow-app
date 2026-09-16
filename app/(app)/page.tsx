import { getDashboardSummary } from "@/lib/data/dashboard";
import { getCategories } from "@/lib/data/transactions";
import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { TransactionModal } from "@/components/TransactionModal";
import { CategoryDoughnutChart } from "@/components/charts/CategoryDoughnutChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { formatBaht, formatDateTime, CHANNEL_LABELS } from "@/lib/format";

export default async function DashboardPage() {
  const [summary, categories, session] = await Promise.all([
    getDashboardSummary(),
    getCategories(),
    getSession(),
  ]);
  const user = session!.user;

  const savingsTarget = summary.totalSavings > 0 ? summary.totalSavings : 1;
  const savingsPercent = Math.min(
    100,
    Math.round((summary.totalSavings / savingsTarget) * 100),
  );

  return (
    <>
      <Header
        title="ภาพรวมการเงิน (Overview)"
        subtitle="สรุปยอดรับ-จ่าย และการจัดการผ่าน LINE Official Account"
        user={user}
        actions={<TransactionModal categories={categories} />}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            tone="purple"
            label="เงินคงเหลือรวม"
            icon="fa-solid fa-wallet"
            value={formatBaht(summary.totalBalance)}
          />
          <MetricCard
            tone="emerald"
            label="รายรับเดือนนี้"
            icon="fa-solid fa-money-bills"
            value={formatBaht(summary.monthIncome)}
            footer={
              <p className="text-xs text-slate-400">
                อัปเดตจาก LINE Slip Auto-Detect
              </p>
            }
          />
          <MetricCard
            tone="rose"
            label="รายจ่ายเดือนนี้"
            icon="fa-solid fa-money-bill-1"
            iconBadge="fa-solid fa-coins"
            value={formatBaht(summary.monthExpense)}
          />
          <MetricCard
            tone="amber"
            label="เงินออมสะสม"
            icon="fa-solid fa-vault"
            value={formatBaht(summary.totalSavings)}
            footer={
              <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${savingsPercent}%` }}
                />
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
            <div className="mb-6">
              <h4 className="font-bold text-slate-800 text-base">
                รายรับ-รายจ่ายเดือนนี้
              </h4>
              <p className="text-xs text-slate-400">
                เปรียบเทียบรายรับ-รายจ่ายผ่านระบบบันทึกไลน์
              </p>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <IncomeExpenseBarChart
                income={summary.monthIncome}
                expense={summary.monthExpense}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-base mb-1">
                หมวดหมู่รายจ่ายสูงสุด
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                จัดกลุ่มอัตโนมัติด้วย LINE AI Bot
              </p>
              <div className="h-48 w-full flex items-center justify-center">
                <CategoryDoughnutChart data={summary.categoryBreakdown} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {summary.categoryBreakdown.map((c) => (
                <div key={c.categoryId} className="flex justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.color ?? "#CBD5E1" }}
                    />
                    {c.name}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatBaht(c.total)}
                  </span>
                </div>
              ))}
              {summary.categoryBreakdown.length === 0 && (
                <p className="text-xs text-slate-400">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium inline-block mb-3 backdrop-blur-sm">
              LINE Official Feature
            </span>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">
              ส่งสลิปโอนเงินเข้าไลน์ แล้วระบบลงบัญชีให้อัตโนมัติ!
            </h3>
            <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
              ไม่ต้องพิมพ์เองให้เสียเวลา เพียงส่งรูป Slip การโอนเงิน หรือพิมพ์บอกสั้นๆ
              เช่น &ldquo;กาแฟ 60&rdquo; Bot จะอ่าน OCR และแยกหมวดหมู่ให้ทันที (เร็ว ๆ นี้)
            </p>
          </div>
          <div className="relative z-10 hidden md:block">
            <div className="w-36 h-36 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
              <i className="fa-solid fa-qrcode text-6xl text-white/90" />
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="font-bold text-slate-800 text-base">
                รายการบันทึกล่าสุด
              </h4>
              <p className="text-xs text-slate-400">
                ซิงก์ข้อมูลเรียลไทม์จากระบบ LINE OA & Web Application
              </p>
            </div>
            <a
              href="/transactions"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              ดูทั้งหมด <i className="fa-solid fa-chevron-right text-[10px]" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">รายการ / รายละเอียด</th>
                  <th className="pb-3 font-medium">ช่องทาง</th>
                  <th className="pb-3 font-medium">หมวดหมู่</th>
                  <th className="pb-3 font-medium">วัน-เวลา</th>
                  <th className="pb-3 font-medium text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.recentTransactions.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  return (
                    <tr key={tx.id}>
                      <td className="py-3 font-medium text-slate-700">{tx.title}</td>
                      <td className="py-3 text-slate-500">
                        {CHANNEL_LABELS[tx.channel] ?? tx.channel}
                      </td>
                      <td className="py-3 text-slate-500">
                        {tx.category?.name ?? "-"}
                      </td>
                      <td className="py-3 text-slate-400">
                        {formatDateTime(tx.occurredAt)}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          isIncome ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatBaht(Number(tx.amount))}
                      </td>
                    </tr>
                  );
                })}
                {summary.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      ยังไม่มีรายการ — เริ่มบันทึกรายรับ/รายจ่ายรายการแรกได้เลย
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
