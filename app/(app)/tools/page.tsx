import { getSession } from "@/lib/session";
import { getUserBudgetSettings } from "@/lib/data/budgetSettings";
import { getFamilyBudgetSettings } from "@/lib/data/appSettings";
import { Header } from "@/components/Header";
import { FinancialCalculators } from "@/components/FinancialCalculators";

export default async function ToolsPage() {
  const [session, personalBudget, familyBudget] = await Promise.all([
    getSession(),
    getUserBudgetSettings(),
    getFamilyBudgetSettings(),
  ]);
  const user = session!.user;

  return (
    <>
      <Header
        title="เครื่องมือการเงิน"
        subtitle="คำนวณดอกเบี้ย ดอกเบี้ยทบต้น เงินออมต่องวด และสัดส่วนการเก็บเงิน"
        user={user}
      />

      <FinancialCalculators personalBudget={personalBudget} familyBudget={familyBudget} />
    </>
  );
}
