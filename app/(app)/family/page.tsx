import { getSession } from "@/lib/session";
import { getFamilyMembers } from "@/lib/data/users";
import { Header } from "@/components/Header";
import { FamilyMembersManager } from "@/components/FamilyMembersManager";

export default async function FamilyPage() {
  const [session, members] = await Promise.all([getSession(), getFamilyMembers()]);
  const user = session!.user;

  return (
    <>
      <Header
        title="บัญชีครอบครัว"
        subtitle="จัดการสมาชิกและสิทธิ์การใช้งานของครอบครัว"
        user={user}
      />

      <div className="max-w-2xl">
        <FamilyMembersManager
          members={members}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </>
  );
}
