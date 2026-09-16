"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatBaht } from "@/lib/format";
import { setUserBudgetSettings } from "@/lib/actions/budgetSettings";
import { setFamilyBudgetSettings } from "@/lib/actions/appSettings";
import type { BudgetRatioPart } from "@/lib/data/budgetSettings";

const inputClass =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";
const cardClass = "bg-white p-6 rounded-3xl border border-slate-100 shadow-soft";
const resultClass = "mt-4 pt-4 border-t border-slate-100 space-y-1 text-sm";

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function SimpleInterestCalculator() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("2");

  const p = toNumber(principal);
  const r = toNumber(rate);
  const t = toNumber(years);
  const interest = (p * r * t) / 100;
  const total = p + interest;

  return (
    <div className={cardClass}>
      <h3 className="font-bold text-slate-800 text-sm mb-1">ดอกเบี้ย (แบบธรรมดา)</h3>
      <p className="text-xs text-slate-400 mb-4">คำนวณดอกเบี้ยคงที่จากเงินต้น</p>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>เงินต้น (บาท)</label>
          <input
            type="number"
            min="0"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>อัตราดอกเบี้ย (% ต่อปี)</label>
          <input
            type="number"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>ระยะเวลา (ปี)</label>
          <input
            type="number"
            min="0"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className={resultClass}>
        <p className="flex justify-between text-slate-500">
          <span>ดอกเบี้ยรวม</span>
          <span className="font-semibold text-slate-700">{formatBaht(interest)}</span>
        </p>
        <p className="flex justify-between text-slate-500">
          <span>ยอดรวมทั้งหมด</span>
          <span className="font-bold text-purple-600">{formatBaht(total)}</span>
        </p>
      </div>
    </div>
  );
}

function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("2");
  const [compoundsPerYear, setCompoundsPerYear] = useState("1");

  const p = toNumber(principal);
  const r = toNumber(rate) / 100;
  const t = toNumber(years);
  const n = toNumber(compoundsPerYear) || 1;
  const total = p * Math.pow(1 + r / n, n * t);
  const interest = total - p;

  return (
    <div className={cardClass}>
      <h3 className="font-bold text-slate-800 text-sm mb-1">ดอกเบี้ยทบต้น</h3>
      <p className="text-xs text-slate-400 mb-4">คำนวณเงินต้นทบดอกเบี้ยหลายรอบ</p>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>เงินต้น (บาท)</label>
          <input
            type="number"
            min="0"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>อัตราดอกเบี้ย (% ต่อปี)</label>
          <input
            type="number"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>ระยะเวลา (ปี)</label>
            <input
              type="number"
              min="0"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ทบต้น (ครั้ง/ปี)</label>
            <input
              type="number"
              min="1"
              value={compoundsPerYear}
              onChange={(e) => setCompoundsPerYear(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>
      <div className={resultClass}>
        <p className="flex justify-between text-slate-500">
          <span>ดอกเบี้ยรวม</span>
          <span className="font-semibold text-slate-700">{formatBaht(interest)}</span>
        </p>
        <p className="flex justify-between text-slate-500">
          <span>ยอดรวมทั้งหมด</span>
          <span className="font-bold text-purple-600">{formatBaht(total)}</span>
        </p>
      </div>
    </div>
  );
}

function SavingsPerInstallmentCalculator() {
  const [goal, setGoal] = useState("50000");
  const [months, setMonths] = useState("12");
  const [rate, setRate] = useState("0");

  const fv = toNumber(goal);
  const nMonths = toNumber(months) || 1;
  const monthlyRate = toNumber(rate) / 100 / 12;
  const installment =
    monthlyRate === 0
      ? fv / nMonths
      : (fv * monthlyRate) / (Math.pow(1 + monthlyRate, nMonths) - 1);

  return (
    <div className={cardClass}>
      <h3 className="font-bold text-slate-800 text-sm mb-1">เงินออมต่องวด</h3>
      <p className="text-xs text-slate-400 mb-4">
        ต้องออมเดือนละเท่าไรถึงจะถึงเป้าหมายที่ตั้งไว้
      </p>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>เป้าหมายเงินออม (บาท)</label>
          <input
            type="number"
            min="0"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>ระยะเวลา (เดือน)</label>
            <input
              type="number"
              min="1"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ดอกเบี้ย (% ต่อปี)</label>
            <input
              type="number"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>
      <div className={resultClass}>
        <p className="flex justify-between text-slate-500">
          <span>ต้องออมเดือนละ</span>
          <span className="font-bold text-purple-600">{formatBaht(installment)}</span>
        </p>
      </div>
    </div>
  );
}

type BudgetPart = { id: string; label: string; percent: string };

function newBudgetPartId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `part-${Date.now()}-${Math.random()}`;
}

function BudgetPartRow({
  part,
  total,
  onUpdate,
  onRemove,
  canRemove,
}: {
  part: BudgetPart;
  total: number;
  onUpdate: (patch: Partial<Omit<BudgetPart, "id">>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const computedAmount = (total * toNumber(part.percent)) / 100;
  const [amountText, setAmountText] = useState(() => computedAmount.toFixed(2));
  const isEditingAmount = useRef(false);

  // Keep the amount field in sync with % (or income) changes from elsewhere
  // — but never while the user is actively typing in this exact field, or
  // every keystroke's round-trip through % would overwrite what they type.
  useEffect(() => {
    if (isEditingAmount.current) return;
    setAmountText(computedAmount.toFixed(2));
  }, [computedAmount]);

  function handleAmountChange(value: string) {
    setAmountText(value);
    const amountNum = toNumber(value);
    // Full precision, no rounding — rounding % here would make the amount
    // computed back from it drift away from what was actually typed.
    const newPercent = total > 0 ? (amountNum / total) * 100 : 0;
    onUpdate({ percent: String(newPercent) });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={part.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="ชื่อส่วน"
        className={`${inputClass} flex-[2] min-w-0`}
      />
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min="0"
          max="100"
          value={part.percent}
          onChange={(e) => onUpdate({ percent: e.target.value })}
          className={`${inputClass} w-16`}
        />
        <span className="text-xs text-slate-400">%</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-slate-400">฿</span>
        <input
          type="number"
          min="0"
          value={amountText}
          onFocus={() => {
            isEditingAmount.current = true;
          }}
          onBlur={() => {
            isEditingAmount.current = false;
            setAmountText(computedAmount.toFixed(2));
          }}
          onChange={(e) => handleAmountChange(e.target.value)}
          className={`${inputClass} w-24`}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        title="ลบส่วนนี้"
        className="text-slate-300 hover:text-rose-500 disabled:opacity-30 transition-colors shrink-0"
      >
        <i className="fa-solid fa-trash-can text-xs" />
      </button>
    </div>
  );
}

type BudgetSettings = { income: string; parts: BudgetRatioPart[] };

function BudgetRatioPanel({
  initialIncome,
  initialParts,
  onSave,
}: {
  initialIncome: string;
  initialParts: BudgetRatioPart[];
  onSave: (settings: BudgetSettings) => Promise<void>;
}) {
  const [income, setIncome] = useState(initialIncome);
  const [parts, setParts] = useState<BudgetPart[]>(() =>
    initialParts.map((p) => ({ ...p, id: newBudgetPartId() })),
  );
  const [, startTransition] = useTransition();

  // Debounced auto-save to the server — skip the very first run (that's just
  // the value we already got from the server, saving it back is redundant)
  // and don't save on every keystroke while someone's mid-edit.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        await onSave({
          income,
          parts: parts.map(({ label, percent }) => ({ label, percent })),
        });
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [parts, income, onSave]);

  const total = toNumber(income);
  const totalPercentRaw = parts.reduce((sum, p) => sum + toNumber(p.percent), 0);
  // Summing floats leaves noise (e.g. 99.99000000000001) even when the
  // parts genuinely add up to 100 — round for display/comparison only, the
  // stored per-part percent values stay full precision.
  const totalPercent = Math.round(totalPercentRaw * 100) / 100;
  // Epsilon tight enough to absorb only float representation noise (~1e-13),
  // not genuine gaps — a real 99.99% (someone's parts actually don't add up)
  // must still trip the warning below.
  const isFullyAllocated = Math.abs(totalPercentRaw - 100) < 1e-6;

  function updatePart(id: string, patch: Partial<BudgetPart>) {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPart() {
    setParts((prev) => [...prev, { id: newBudgetPartId(), label: "", percent: "0" }]);
  }

  function removePart(id: string) {
    setParts((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  return (
    <div>
      <div>
        <label className={labelClass}>รายได้ต่อเดือน (บาท)</label>
        <input
          type="number"
          min="0"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="mt-4 space-y-2">
        {parts.map((part) => (
          <BudgetPartRow
            key={part.id}
            part={part}
            total={total}
            onUpdate={(patch) => updatePart(part.id, patch)}
            onRemove={() => removePart(part.id)}
            canRemove={parts.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addPart}
        className="mt-3 text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
      >
        <i className="fa-solid fa-plus" /> เพิ่มส่วน
      </button>

      <div className={resultClass}>
        <p className="flex justify-between text-slate-500">
          <span>รวมทั้งหมด</span>
          <span
            className={`font-semibold ${isFullyAllocated ? "text-emerald-600" : "text-amber-600"}`}
          >
            {totalPercent}%
          </span>
        </p>
        {!isFullyAllocated && (
          <p className="text-[11px] text-amber-600">
            <i className="fa-solid fa-triangle-exclamation mr-1" />
            สัดส่วนรวมยังไม่ครบ 100%
          </p>
        )}
      </div>
    </div>
  );
}

function BudgetRatioCalculator({
  personalBudget,
  familyBudget,
}: {
  personalBudget: BudgetSettings;
  familyBudget: BudgetSettings;
}) {
  const [tab, setTab] = useState<"personal" | "family">("personal");

  return (
    <div className={cardClass}>
      <h3 className="font-bold text-slate-800 text-sm mb-1">สัดส่วนการเก็บเงิน</h3>
      <p className="text-xs text-slate-400 mb-4">
        แบ่งรายได้เป็นกี่ส่วนก็ได้ ตั้งชื่อและเปอร์เซ็นต์เอง
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("personal")}
          className={`flex-1 text-center py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "personal"
              ? "bg-purple-50 border-purple-200 text-purple-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ส่วนบุคคล
        </button>
        <button
          type="button"
          onClick={() => setTab("family")}
          className={`flex-1 text-center py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "family"
              ? "bg-purple-50 border-purple-200 text-purple-600"
              : "border-slate-200 text-slate-500"
          }`}
        >
          ครอบครัว
        </button>
      </div>

      {/* Both panels stay mounted (hidden, not unmounted) so switching tabs
          never loses in-progress edits or re-fetches anything. */}
      <div hidden={tab !== "personal"}>
        <BudgetRatioPanel
          initialIncome={personalBudget.income}
          initialParts={personalBudget.parts}
          onSave={setUserBudgetSettings}
        />
      </div>
      <div hidden={tab !== "family"}>
        <BudgetRatioPanel
          initialIncome={familyBudget.income}
          initialParts={familyBudget.parts}
          onSave={setFamilyBudgetSettings}
        />
      </div>
    </div>
  );
}

export function FinancialCalculators({
  personalBudget,
  familyBudget,
}: {
  personalBudget: BudgetSettings;
  familyBudget: BudgetSettings;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <BudgetRatioCalculator personalBudget={personalBudget} familyBudget={familyBudget} />
      <SimpleInterestCalculator />
      <CompoundInterestCalculator />
      <SavingsPerInstallmentCalculator />
    </div>
  );
}
