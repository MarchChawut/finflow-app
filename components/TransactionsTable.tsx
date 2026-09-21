"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteTransaction, loadMoreTransactions, fetchTransactionsForTab } from "@/lib/actions/transactions";
import type { TransactionTab } from "@/lib/data/transactions";
import { formatBaht, formatDateTime, CHANNEL_LABELS } from "@/lib/format";
import { EditTransactionButton } from "@/components/EditTransactionButton";

// Slip-OCR reads below this confidence get flagged for a human to check —
// see the Phase 4c note in app/api/line/webhook/route.ts.
const OCR_CONFIDENCE_REVIEW_THRESHOLD = 0.6;

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type Transaction = {
  id: string;
  title: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  channel: string;
  categoryId: string | null;
  ocrConfidence: number | null;
  occurredAt: Date;
  category: { name: string } | null;
  visibility: "PERSONAL" | "FAMILY";
};

export function TransactionsTable({
  transactions,
  hasMore,
  categories,
}: {
  transactions: Transaction[];
  hasMore: boolean;
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // `transactions`/`hasMore` props are always the server-rendered first page
  // of the FAMILY tab (see app/(app)/transactions/page.tsx). This component
  // owns its own copy so paging and tab-switching don't need a server round
  // trip through the parent on every click.
  const [tab, setTab] = useState<TransactionTab>("family");
  const [items, setItems] = useState(transactions);
  const [hasMoreState, setHasMoreState] = useState(hasMore);
  const [loadingMore, startLoadMoreTransition] = useTransition();
  const [switchingTab, startTabTransition] = useTransition();

  function loadTab(nextTab: TransactionTab) {
    startTabTransition(async () => {
      const next = await fetchTransactionsForTab(nextTab);
      setItems(next.transactions);
      setHasMoreState(next.hasMore);
    });
  }

  function handleTabChange(nextTab: TransactionTab) {
    if (nextTab === tab) return;
    setTab(nextTab);
    loadTab(nextTab);
  }

  // Whenever the server actually re-fetches (create/edit/delete triggers
  // revalidatePath), the `transactions` prop changes. On the FAMILY tab
  // that's exactly our data, so resync directly — a plain state adjustment,
  // safe during render, per the same "did this change since last render"
  // pattern used in Sidebar.tsx/GoalModal.tsx, avoiding the extra
  // commit+effect round trip. This does mean a mutation collapses any
  // additional "load more" pages back to page one, an acceptable tradeoff
  // for a household-scale app.
  const [prevTransactions, setPrevTransactions] = useState(transactions);
  if (transactions !== prevTransactions) {
    setPrevTransactions(transactions);
    if (tab === "family") {
      setItems(transactions);
      setHasMoreState(hasMore);
    }
    // else: the PERSONAL tab's refetch below (in the effect) handles it —
    // that's a real side effect (a network call), unlike the sync setState
    // above, so it can't run directly in the render body.
  }

  // Mirrors the branch above for the PERSONAL tab: `transactions` (the
  // FAMILY-tab prop) only changes on this identity when the server actually
  // re-fetches, so this effect re-runs exactly then — not on every render —
  // and re-fetches our own tab's fresh page instead of adopting the
  // FAMILY-tab data. Kept out of the render body (unlike the sync branch
  // above) so React can't fire this network call twice for one prop change
  // under Strict Mode's dev-mode double-render-without-commit.
  useEffect(() => {
    if (tab !== "family") {
      loadTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => {
      const matchQ =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.category?.name ?? "").toLowerCase().includes(q);
      const matchType = typeFilter === "all" || t.type === typeFilter;
      return matchQ && matchType;
    });
  }, [items, search, typeFilter]);

  function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้ใช่ไหม?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteTransaction(id);
      setDeletingId(null);
    });
  }

  function handleLoadMore() {
    startLoadMoreTransition(async () => {
      const next = await loadMoreTransactions(items.length, tab);
      setItems((prev) => [...prev, ...next.transactions]);
      setHasMoreState(next.hasMore);
    });
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleTabChange("family")}
          disabled={switchingTab}
          className={`flex-1 sm:flex-none sm:px-6 text-center py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-60 ${
            tab === "family"
              ? "bg-purple-50 border-purple-200 text-purple-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ครอบครัว
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("personal")}
          disabled={switchingTab}
          className={`flex-1 sm:flex-none sm:px-6 text-center py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-60 ${
            tab === "personal"
              ? "bg-purple-50 border-purple-200 text-purple-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ส่วนตัว
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารายการ..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 text-slate-600 font-medium"
          >
            <option value="all">ทุกประเภท</option>
            <option value="INCOME">รายรับ</option>
            <option value="EXPENSE">รายจ่าย</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="pb-3 font-medium">รายการ</th>
              <th className="pb-3 font-medium">ที่มา (Channel)</th>
              <th className="pb-3 font-medium">หมวดหมู่</th>
              <th className="pb-3 font-medium">วันที่</th>
              <th className="pb-3 font-medium text-right">จำนวนเงิน (บาท)</th>
              <th className="pb-3 font-medium text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((tx) => {
              const isIncome = tx.type === "INCOME";
              const needsReview =
                tx.channel === "SLIP_OCR" &&
                (tx.ocrConfidence == null ||
                  tx.ocrConfidence < OCR_CONFIDENCE_REVIEW_THRESHOLD);
              return (
                <tr key={tx.id} className={deletingId === tx.id ? "opacity-40" : ""}>
                  <td className="py-3 font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      {tx.title}
                      {tx.visibility === "PERSONAL" && (
                        <span
                          title="มองเห็นได้เฉพาะคุณ"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 whitespace-nowrap"
                        >
                          <i className="fa-solid fa-lock mr-1" />
                          ส่วนตัว
                        </span>
                      )}
                      {needsReview && (
                        <span
                          title={`ความมั่นใจในการอ่านสลิป: ${Math.round((tx.ocrConfidence ?? 0) * 100)}%`}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap"
                        >
                          <i className="fa-solid fa-triangle-exclamation mr-1" />
                          ตรวจสอบยอด
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-slate-500">
                    {CHANNEL_LABELS[tx.channel] ?? tx.channel}
                  </td>
                  <td className="py-3 text-slate-500">{tx.category?.name ?? "-"}</td>
                  <td className="py-3 text-slate-400">{formatDateTime(tx.occurredAt)}</td>
                  <td
                    className={`py-3 text-right font-semibold ${
                      isIncome ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatBaht(Number(tx.amount))}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-center gap-3">
                      <EditTransactionButton transaction={tx} categories={categories} />
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={pending}
                        className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                        title="ลบรายการ"
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  ไม่พบรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMoreState && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore || switchingTab}
            className="text-xs font-medium px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-60 transition-colors"
          >
            {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่ม"}
          </button>
        </div>
      )}
    </div>
  );
}
