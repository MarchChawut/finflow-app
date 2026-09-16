"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-all text-xs shrink-0"
    >
      <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} mr-1`} />
      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}
