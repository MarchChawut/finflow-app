import { getGoals } from "@/lib/data/goals";
import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { GoalModal } from "@/components/GoalModal";
import { GoalsGrid } from "@/components/GoalsGrid";

export default async function GoalsPage() {
  const [goals, session] = await Promise.all([getGoals(), getSession()]);
  const user = session!.user;

  return (
    <>
      <Header
        title="กระเป๋า"
        subtitle="สร้างกระเป๋าเก็บเงิน จัดสัดส่วนได้เอง แจ้งเตือนออมผ่าน LINE ทุกเดือน"
        user={user}
        actions={<GoalModal />}
      />

      <GoalsGrid goals={goals} />
    </>
  );
}
