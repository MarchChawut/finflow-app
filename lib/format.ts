const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBaht(amount: number) {
  return `฿ ${currencyFormatter.format(amount)}`;
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date | string) {
  return dateFormatter.format(new Date(date));
}

export const CHANNEL_LABELS: Record<string, string> = {
  DASHBOARD: "เว็บแดชบอร์ด",
  LINE_CHAT: "LINE OA Bot",
  LIFF_FORM: "LIFF Form",
  SLIP_OCR: "สแกนสลิป (OCR)",
};
