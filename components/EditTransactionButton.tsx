"use client";

import { updateTransaction } from "@/lib/actions/transactions";
import { TransactionFormModal } from "@/components/TransactionModal";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

export function EditTransactionButton({
  transaction,
  categories,
}: {
  transaction: {
    id: string;
    title: string;
    amount: string;
    type: "INCOME" | "EXPENSE";
    channel: string;
    categoryId: string | null;
  };
  categories: Category[];
}) {
  return (
    <TransactionFormModal
      heading="แก้ไขรายการ"
      submitLabel="บันทึกการแก้ไข"
      action={updateTransaction.bind(null, transaction.id)}
      categories={categories}
      fixedChannel={transaction.channel}
      initialValues={{
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
      }}
      trigger={(open) => (
        <button
          onClick={open}
          title="แก้ไขรายการ"
          className="text-slate-300 hover:text-slate-600 transition-colors"
        >
          <i className="fa-solid fa-pen" />
        </button>
      )}
    />
  );
}
