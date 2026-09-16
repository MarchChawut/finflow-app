import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";

// Auth check here is a cheap, JWT-only redirect for defense-in-depth
// alongside Proxy's optimistic check — it is NOT the sole gate. Per
// node_modules/next/dist/docs/.../guides/authentication.md, a Layout does
// not stop nested segments from rendering/streaming, so every page's actual
// data fetch (lib/data/*, lib/dal.ts's verifySession) re-checks the session
// independently before touching the DB.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 p-4 pt-[4.5rem] md:p-8 lg:pt-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
