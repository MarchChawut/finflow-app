import type { ReactNode } from "react";
import { signOut } from "@/auth";

export function Header({
  title,
  subtitle,
  user,
  actions,
}: {
  title: string;
  subtitle: string;
  user: { name?: string | null; image?: string | null; role: string };
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-xs md:text-sm text-slate-400 font-normal">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {actions}
        <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-100 shadow-sm">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL
            <img
              src={user.image}
              alt={user.name ?? "Avatar"}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-pastel-purple text-pastel-purple-dark flex items-center justify-center text-xs font-bold ring-2 ring-purple-200">
              {(user.name ?? "U").slice(0, 1)}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-700">
              {user.name ?? "สมาชิกครอบครัว"}
            </p>
            <p className="text-[10px] text-slate-400">
              {user.role === "ADMIN" ? "Admin" : "Family Member"}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              title="ออกจากระบบ"
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
