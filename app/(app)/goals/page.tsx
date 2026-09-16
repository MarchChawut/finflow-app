import { getGoals } from "@/lib/data/goals";
import { getSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { GoalModal } from "@/components/GoalModal";
import { GoalCard } from "@/components/GoalCard";

export default async function GoalsPage() {
  const [goals, session] = await Promise.all([getGoals(), getSession()]);
  const user = session!.user;

  return (
    <>
      <Header
        title="เป้าหมายการออมเงิน"
        subtitle="สร้างเป้าหมายเก็บเงิน แจ้งเตือนออมผ่าน LINE ทุกเดือน"
        user={user}
        actions={<GoalModal />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-slate-400 col-span-full text-center py-12">
            ยังไม่มีเป้าหมายการออม — เริ่มสร้างเป้าหมายแรกได้เลย
          </p>
        )}
      </div>
    </>
  );
}
