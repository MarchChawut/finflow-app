"use client";

import { useTransition } from "react";
import { deleteCategory } from "@/lib/actions/categories";
import { EditCategoryButton } from "@/components/EditCategoryButton";
import { CategoryModal } from "@/components/CategoryModal";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
};

function CategoryRow({ category }: { category: Category }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `ลบหมวดหมู่ "${category.name}" ใช่ไหม? รายการที่เคยใช้หมวดหมู่นี้จะยังอยู่ แค่ไม่มีหมวดหมู่กำกับแล้ว`,
      )
    )
      return;
    startTransition(async () => {
      await deleteCategory(category.id);
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-slate-50 transition-opacity ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.color ?? "#CBD5E1" }}
        />
        <span className="text-sm text-slate-700 truncate">{category.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <EditCategoryButton category={category} />
        <button
          onClick={handleDelete}
          disabled={pending}
          title="ลบหมวดหมู่"
          className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
        >
          <i className="fa-solid fa-trash-can text-xs" />
        </button>
      </div>
    </div>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">หมวดหมู่การเงิน</h3>
          <p className="text-xs text-slate-400 mt-1">
            ใช้จัดกลุ่มรายรับ-รายจ่าย ทั้งบนเว็บและตอนพิมพ์ผ่าน LINE
          </p>
        </div>
        <CategoryModal />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
            รายรับ
          </p>
          <div className="space-y-1.5">
            {income.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
            {income.length === 0 && (
              <p className="text-xs text-slate-400 py-2">ยังไม่มีหมวดหมู่รายรับ</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider mb-2">
            รายจ่าย
          </p>
          <div className="space-y-1.5">
            {expense.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
            {expense.length === 0 && (
              <p className="text-xs text-slate-400 py-2">ยังไม่มีหมวดหมู่รายจ่าย</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
