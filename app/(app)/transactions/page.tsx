import { getInitialTransactionsPage, getCategories } from "@/lib/data/transactions";
import { getRecurringBills } from "@/lib/data/recurringBills";
import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { TransactionModal } from "@/components/TransactionModal";
import { TransactionsTable } from "@/components/TransactionsTable";
import { RecurringBillsManager } from "@/components/RecurringBillsManager";

export default async function TransactionsPage() {
  const [{ transactions, hasMore }, categories, recurringBills, session] = await Promise.all([
    getInitialTransactionsPage(),
    getCategories(),
    getRecurringBills(),
    getSession(),
  ]);
  const user = session!.user;

  return (
    <>
      <Header
        title="รายการบันทึกเงิน"
        subtitle="รายรับ-รายจ่ายทั้งหมด บันทึกผ่านเว็บและ LINE OA"
        user={user}
        actions={<TransactionModal categories={categories} />}
      />
      <RecurringBillsManager bills={recurringBills} categories={categories} />
      <TransactionsTable transactions={transactions} hasMore={hasMore} categories={categories} />
    </>
  );
}
