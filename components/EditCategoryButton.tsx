"use client";

import { updateCategory } from "@/lib/actions/categories";
import { CategoryFormModal } from "@/components/CategoryModal";

export function EditCategoryButton({
  category,
}: {
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    color: string | null;
  };
}) {
  return (
    <CategoryFormModal
      heading="แก้ไขหมวดหมู่"
      submitLabel="บันทึกการแก้ไข"
      action={updateCategory.bind(null, category.id)}
      initialValues={{
        name: category.name,
        type: category.type,
        color: category.color ?? undefined,
      }}
      trigger={(open) => (
        <button
          onClick={open}
          title="แก้ไขหมวดหมู่"
          className="text-slate-300 hover:text-slate-600 transition-colors"
        >
          <i className="fa-solid fa-pen text-xs" />
        </button>
      )}
    />
  );
}
