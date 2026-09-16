"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  // No current item uses this (the one that did, LINE OA Simulator, was
  // removed), but a future nav entry may want one again.
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ภาพรวมบัญชี", icon: "fa-solid fa-chart-pie text-purple-500" },
  {
    href: "/transactions",
    label: "รายการบันทึกเงิน",
    icon: "fa-solid fa-receipt text-cyan-500",
  },
  {
    href: "/goals",
    label: "เป้าหมายการออม",
    icon: "fa-solid fa-piggy-bank text-pink-500",
  },
  {
    href: "/family",
    label: "สมาชิกครอบครัว",
    icon: "fa-solid fa-house-user text-orange-500",
  },
  {
    href: "/tools",
    label: "เครื่องมือการเงิน",
    icon: "fa-solid fa-calculator text-indigo-500",
  },
  {
    href: "/ai-advisor",
    label: "AI Financial Coach",
    icon: "fa-solid fa-wand-magic-sparkles text-amber-500",
  },
  {
    href: "/settings",
    label: "ตั้งค่า LINE OA / Rich Menu",
    icon: "fa-solid fa-sliders text-rose-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-close the drawer whenever the route actually changes (covers
  // back/forward nav too, not just clicking a link inside this component).
  // Adjusting state during render (guarded by a "did this change since last
  // render" check) instead of in a useEffect avoids the extra commit+effect
  // round trip — same pattern as TransactionModal.tsx/GoalModal.tsx.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile-only top bar: hamburger + brand mark. Sits above the fold at
          a fixed height so it never overlaps a page's own <Header> title
          underneath (see app/(app)/layout.tsx's matching pt-14). Hidden at
          lg: where the sidebar is always visible instead. */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center gap-3 px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <i className="fa-solid fa-bars text-lg" />
        </button>
        <Image
          src="/img/finflow_logo.png"
          alt="FinFlow"
          width={28}
          height={28}
          className="w-7 h-7 rounded-lg object-cover shrink-0"
        />
        <span className="font-bold text-sm text-slate-800">FinFlow</span>
      </div>

      {/* Backdrop — mobile only, only rendered while open. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-slate-900/40"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-md border-r border-slate-100 p-5 flex flex-col justify-between transition-transform duration-300 lg:z-20 lg:h-screen lg:sticky lg:top-0 lg:translate-x-0 lg:bg-white/80 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center gap-3 px-3 py-2 mb-8">
            <Image
              src="/img/finflow_logo.png"
              alt="FinFlow"
              width={44}
              height={44}
              className="w-11 h-11 rounded-2xl object-cover shadow-md shadow-purple-200"
            />
            <div>
              <h1 className="font-bold text-lg text-slate-800 leading-snug">
                FinFlow{" "}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  LINE OA
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-normal">
                ระบบการเงินส่วนบุคคลผ่านไลน์
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="ปิดเมนู"
              className="lg:hidden ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-purple-700 bg-purple-50 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <i className={`${item.icon} text-lg`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-100/80 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shadow-sm">
              <i className="fa-brands fa-line" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                LINE Official Status
              </p>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                เชื่อมต่อเรียบร้อย
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            บัญชีไลน์: @FinFlow.TH (LIFF Connected)
          </p>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="w-full text-xs font-semibold py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <i className="fa-regular fa-paper-plane" /> ลองส่งข้อความทดสอบ
          </Link>
        </div>
      </aside>
    </>
  );
}
