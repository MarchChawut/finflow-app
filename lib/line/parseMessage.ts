// Same heuristic as docs/mockup.html's LINE-sim `sendLineMessage()` (first
// number = amount, a handful of Thai keywords = income), generalized to
// accept decimals and to derive a clean title. Pure function — no I/O — so
// it's testable in isolation and shared between the real webhook (3a) and
// any future unit tests.
export type ParsedMoneyMessage = {
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
};

const INCOME_KEYWORDS = ["เงินเดือน", "โบนัส", "รับ", "เข้า", "โอนเข้า"];

// Matches thousands-separator commas too (e.g. "15,000") — same pattern as
// parseSlip.ts's NUMBER_PATTERN, kept in sync so both parsers handle amounts
// the same way.
const NUMBER_PATTERN = /[\d,]+\.\d+|[\d,]+/;

export function parseThaiMoneyMessage(text: string): ParsedMoneyMessage | null {
  const numberMatch = text.match(NUMBER_PATTERN);
  if (!numberMatch) return null;

  const amount = parseFloat(numberMatch[0].replace(/,/g, ""));
  if (!(amount > 0)) return null;

  const type: ParsedMoneyMessage["type"] = INCOME_KEYWORDS.some((kw) =>
    text.includes(kw),
  )
    ? "INCOME"
    : "EXPENSE";

  const title = text
    .replace(numberMatch[0], "")
    .replace(/บาท/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title || (type === "INCOME" ? "รายรับจาก LINE" : "รายจ่ายจาก LINE"),
    amount,
    type,
  };
}
