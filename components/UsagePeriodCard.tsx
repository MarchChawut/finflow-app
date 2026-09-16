"use client";

import { useRef, useState, useTransition } from "react";
import { setUsagePeriodExpiresAt } from "@/lib/actions/appSettings";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toShortDisplay(value: string): string {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function UsagePeriodCard({ expiresAt }: { expiresAt: Date }) {
  // Mirrors the saved prop for instant feedback in the calendar field while
  // its own persist transition is in flight — saves immediately on pick,
  // there is no separate "save" step for this card.
  const [dateValue, setDateValue] = useState(toDateInputValue(expiresAt));
  const [pending, startTransition] = useTransition();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay);
  const expired = daysLeft < 0;

  function handleDateChange(value: string) {
    setDateValue(value);
    if (value) startTransition(() => setUsagePeriodExpiresAt(value));
  }

  function openPicker() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  }

  return (
    <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      {/* Decorative background accent — approximates the mockup's corner
          illustration with plain CSS gradients, since a literal 3D render
          isn't something we can produce here. */}
      <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-purple-200/40 to-emerald-200/30 blur-2xl" />

      <div className="relative flex items-start gap-3 mb-5">
        <div className="shrink-0 w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center">
          <i className="fa-solid fa-calendar-check text-purple-500 text-lg" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-0.5">ช่วงเวลาการใช้งาน</h3>
          <p className="text-xs text-slate-400">
            เลือกวันสิ้นสุดจากปฏิทินได้เอง (เหมือนกำหนดวันสิ้นปีงบประมาณ) — บันทึกทันทีที่เลือก
          </p>
        </div>
      </div>

      <div
        className={`relative overflow-hidden flex items-center gap-4 mb-4 p-4 rounded-2xl bg-gradient-to-r transition-colors ${
          expired
            ? "from-rose-50 to-rose-100/60 text-rose-700"
            : "from-emerald-50 to-emerald-100/60 text-emerald-700"
        }`}
      >
        <div className="shrink-0 w-12 h-12 rounded-full bg-white/70 shadow-sm flex items-center justify-center">
          <i className={`fa-solid ${expired ? "fa-triangle-exclamation" : "fa-check"} text-xl`} />
        </div>
        <div>
          <p className="text-3xl font-extrabold tabular-nums leading-none">
            {Math.abs(daysLeft)}
          </p>
          <p className="text-[11px] font-medium mt-1 opacity-80">
            {expired ? "วันที่หมดอายุไปแล้ว" : "วันที่เหลืออยู่"}
          </p>
        </div>

        <div className="w-px self-stretch bg-current opacity-15" />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <i className="fa-solid fa-calendar-days text-xs opacity-70" />
            <p className="text-[11px] font-medium opacity-80">หมดอายุวันที่</p>
          </div>
          <p className="text-sm font-bold truncate">
            {expiresAt.toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Native date input stays the real, keyboard-accessible control —
          just visually hidden. The styled row below triggers it. */}
      <input
        ref={dateInputRef}
        type="date"
        value={dateValue}
        disabled={pending}
        onChange={(e) => handleDateChange(e.target.value)}
        className="sr-only"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={pending}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 disabled:opacity-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
            <i className="fa-solid fa-calendar-days text-purple-500" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[11px] text-slate-400">แก้ไขวันหมดอายุ</p>
            <p className="text-sm font-bold text-slate-800 truncate">
              {toShortDisplay(dateValue)}
            </p>
          </div>
        </div>
        <span className="shrink-0 w-9 h-9 rounded-full bg-purple-600 text-white shadow-sm flex items-center justify-center">
          <i className="fa-solid fa-calendar-days text-sm" />
        </span>
      </button>
    </div>
  );
}
