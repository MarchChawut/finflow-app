const TONES = {
  purple: {
    gradient: "from-purple-50 to-indigo-50/50",
    border: "border-purple-100",
    badgeBorder: "border-purple-100",
    badgeText: "text-purple-600",
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-600",
  },
  emerald: {
    gradient: "from-emerald-50 to-teal-50/50",
    border: "border-emerald-100",
    badgeBorder: "border-emerald-100",
    badgeText: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
  },
  rose: {
    gradient: "from-rose-50 to-pink-50/50",
    border: "border-pink-100",
    badgeBorder: "border-pink-100",
    badgeText: "text-rose-600",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-600",
  },
  amber: {
    gradient: "from-amber-50 to-yellow-50/50",
    border: "border-amber-100",
    badgeBorder: "border-amber-100",
    badgeText: "text-amber-600",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
  },
} as const;

export function MetricCard({
  tone,
  label,
  icon,
  iconBadge,
  value,
  footer,
}: {
  tone: keyof typeof TONES;
  label: string;
  icon: string;
  /** Small icon layered on the bottom-right corner of the main icon —
   * for cases a single Font Awesome glyph can't represent alone (e.g.
   * "a bill with a coin"). */
  iconBadge?: string;
  value: string;
  footer?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`p-6 rounded-3xl bg-gradient-to-br ${t.gradient} border ${t.border} shadow-soft hover:shadow-soft-lg transition-all`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold ${t.badgeText} bg-white/80 px-3 py-1 rounded-full border ${t.badgeBorder}`}
        >
          {label}
        </span>
        <div
          className={`relative w-10 h-10 rounded-2xl ${t.iconBg} ${t.iconText} flex items-center justify-center text-lg`}
        >
          <i className={icon} />
          {iconBadge && (
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white ${t.iconText} flex items-center justify-center text-[9px] shadow-sm ring-1 ring-white`}
            >
              <i className={iconBadge} />
            </span>
          )}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-1">{value}</h3>
      {footer}
    </div>
  );
}
