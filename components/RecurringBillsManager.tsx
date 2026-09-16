"use client";

import { useTransition } from "react";
import { deleteRecurringBill, markRecurringBillPaid } from "@/lib/actions/recurringBills";
import { EditRecurringBillButton } from "@/components/EditRecurringBillButton";
import { RecurringBillModal } from "@/components/RecurringBillModal";
import { formatBaht } from "@/lib/format";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type Bill = {
  id: string;
  name: string;
  amount: string;
  categoryId: string | null;
  paidThisMonth: boolean;
};

function BillRow({ bill, categories }: { bill: Bill; categories: Category[] }) {
  const [pending, startTransition] = useTransition();

  function handleMarkPaid() {
    if (
      !confirm(
        `บันทึกว่าจ่าย "${bill.name}" ${formatBaht(Number(bill.amount))} แล้วใช่ไหม? จะสร้างรายการรายจ่ายจริงในตารางด้านล่าง`,
      )
    )
      return;
    startTransition(async () => {
      await markRecurringBillPaid(bill.id);
    });
  }

  function handleDelete() {
    if (!confirm(`ลบรายจ่ายประจำเดือน "${bill.name}" ใช่ไหม?`)) return;
    startTransition(async () => {
      await deleteRecurringBill(bill.id);
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-slate-50 transition-opacity ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm text-slate-700 truncate">{bill.name}</p>
        <p className="text-xs text-slate-400">{formatBaht(Number(bill.amount))}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleMarkPaid}
          disabled={pending || bill.paidThisMonth}
          className={`text-xs font-medium px-3 py-1.5 rounded-xl transition-all disabled:opacity-60 ${
            bill.paidThisMonth
              ? "bg-emerald-50 text-emerald-600"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {bill.paidThisMonth ? "จ่ายแล้วเดือนนี้ ✓" : "จ่ายแล้ว"}
        </button>
        <EditRecurringBillButton bill={bill} categories={categories} />
        <button
          onClick={handleDelete}
          disabled={pending}
          title="ลบรายจ่าย"
          className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
        >
          <i className="fa-solid fa-trash-can text-xs" />
        </button>
      </div>
    </div>
  );
}

export function RecurringBillsManager({
  bills,
  categories,
}: {
  bills: Bill[];
  categories: Category[];
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">รายจ่ายประจำเดือน</h3>
          <p className="text-xs text-slate-400 mt-1">
            ค่าน้ำ ค่าไฟ ค่าโทรศัพท์ ค่าประกัน ฯลฯ — กด &ldquo;จ่ายแล้ว&rdquo; เพื่อบันทึกเป็นรายการจริง
          </p>
        </div>
        <RecurringBillModal categories={categories} />
      </div>

      <div className="space-y-1.5">
        {bills.map((bill) => (
          <BillRow key={bill.id} bill={bill} categories={categories} />
        ))}
        {bills.length === 0 && (
          <p className="text-xs text-slate-400 py-2">ยังไม่มีรายจ่ายประจำเดือน</p>
        )}
      </div>
    </div>
  );
}
