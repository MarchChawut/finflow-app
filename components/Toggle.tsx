"use client";

// The app's one shared toggle-switch visual pattern (bigger, fully rounded
// track with a soft shadow, purple-600 fill when on — the app's one accent
// color, kept consistent rather than introducing a second "switch" color).
// Used by SavingsReminderCard.tsx and LineConnectionToggle.tsx.
export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`shrink-0 w-14 h-8 rounded-full transition-colors relative disabled:opacity-50 ${
        checked
          ? "bg-purple-600 shadow-inner shadow-purple-800/20"
          : "bg-slate-200 shadow-inner shadow-slate-400/10"
      }`}
    >
      <span
        className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
