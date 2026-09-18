// Thai bank transfer slips typically show several numbers (fee, running
// balance, the transferred amount itself), so unlike parseMessage.ts's
// "first number wins" heuristic (fine for a short chat message), this
// anchors on the keywords that actually label the amount on a slip.
export type ParsedSlip = {
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
};

const AMOUNT_KEYWORDS = ["จำนวนเงิน", "จำนวน", "ยอดเงิน", "โอนเงิน"];
const NET_PAY_KEYWORDS = ["เงินได้สุทธิ"];
// Payslip-style documents (เงินเดือน) are income, not an outgoing transfer —
// unlike AMOUNT_KEYWORDS this is checked against the whole document, not
// line-by-line, since these words usually label a column/section rather
// than sit next to the number we want.
const INCOME_KEYWORDS = ["เงินเดือน", "รายการเงินได้", "เงินได้สุทธิ", "รับโอน", "ได้รับเงิน"];
const NUMBER_PATTERN = /[\d,]+\.\d{2}|[\d,]+/;

function findAmount(lines: string[], keywords: string[]): number | null {
  for (const line of lines) {
    if (keywords.some((kw) => line.includes(kw))) {
      const match = line.match(NUMBER_PATTERN);
      if (match) {
        const amount = parseFloat(match[0].replace(/,/g, ""));
        if (amount > 0) return amount;
      }
    }
  }
  return null;
}

export function parseSlipText(rawText: string): ParsedSlip | null {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const isPayslip = INCOME_KEYWORDS.some((kw) => rawText.includes(kw));
  const type: "INCOME" | "EXPENSE" = isPayslip ? "INCOME" : "EXPENSE";

  if (isPayslip) {
    // Prefer the net-pay line over the generic passes below — a payslip's
    // income-column subtotal often reads out of Vision's OCR before the
    // net-pay line at the bottom of the page, which Pass 2's "first บาท
    // line wins" would otherwise grab by accident of column order.
    const netPay = findAmount(lines, NET_PAY_KEYWORDS);
    if (netPay !== null) {
      return { title: "สลิปเงินเดือน", amount: netPay, type };
    }
  }

  // Pass 1: a line naming the amount explicitly, e.g. "จำนวนเงิน 1,250.00 บาท".
  const labeled = findAmount(lines, AMOUNT_KEYWORDS);
  if (labeled !== null) {
    return { title: isPayslip ? "สลิปเงินเดือน" : "สลิปโอนเงิน", amount: labeled, type };
  }

  // Pass 2: fall back to a line that's just "123.45 บาท" on its own,
  // common on simpler slip layouts without an explicit label.
  for (const line of lines) {
    if (!line.includes("บาท")) continue;
    const match = line.match(NUMBER_PATTERN);
    if (match) {
      const amount = parseFloat(match[0].replace(/,/g, ""));
      if (amount > 0) {
        return { title: isPayslip ? "สลิปเงินเดือน" : "สลิปโอนเงิน", amount, type };
      }
    }
  }

  return null;
}
