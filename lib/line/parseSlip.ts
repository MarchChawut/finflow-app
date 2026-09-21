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

// Card-style app slips (e.g. SCB's "โอนเงินสำเร็จ" screenshot) often put a
// label and its value on two separate lines instead of one line like
// "จำนวนเงิน 60.00 บาท" — Vision's OCR reconstructs reading order
// geometrically and has no notion of which label belongs with which value.
// Only these two keywords are allowed to look ahead to the next line(s), not
// all of AMOUNT_KEYWORDS: "โอนเงิน" is a substring of the header "โอนเงิน
// สำเร็จ", which sits above the real amount row — enabling lookahead for it
// would let the header's lookahead grab the date/time or reference-code line
// right after it before the loop ever reaches the real label. Bare "จำนวน"
// is excluded too since it collides with unrelated labels (e.g. "จำนวน
// รายการ", an item count).
const LOOKAHEAD_KEYWORDS = ["จำนวนเงิน", "ยอดเงิน"];

// A lookahead candidate line must be NOTHING BUT the number (plus an
// optional "บาท" suffix) — anchored full-line match, not "contains a digit
// somewhere" — so it can't match a masked account number ("xxx-xxx073-3"),
// a reference code ("202609192RbA4WJt7SjNRiEpx"), or a date/time line. The
// mandatory two decimal places also rule out a bare year fragment like
// "2569". A false positive here would silently record a wrong amount, which
// is worse than the existing "couldn't read, please type it" fallback, so
// this stays strict even at the cost of still missing some exotic layouts.
const STANDALONE_AMOUNT_PATTERN = /^([\d,]+\.\d{2})(?:\s*บาท)?$/;

function parseAmountToken(token: string): number | null {
  const amount = parseFloat(token.replace(/,/g, ""));
  return amount > 0 ? amount : null;
}

function findAmount(
  lines: string[],
  keywords: string[],
  lookaheadKeywords: string[] = [],
): number | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!keywords.some((kw) => line.includes(kw))) continue;

    const sameLineMatch = line.match(NUMBER_PATTERN);
    if (sameLineMatch) {
      const amount = parseAmountToken(sameLineMatch[0]);
      if (amount !== null) return amount;
    }

    if (!lookaheadKeywords.some((kw) => line.includes(kw))) continue;

    // Look at up to the next 2 lines for a standalone value — stop early if
    // one of them is itself another labeled row, so a missing value doesn't
    // accidentally borrow the next row's number.
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const next = lines[j];
      if (AMOUNT_KEYWORDS.some((kw) => next.includes(kw)) || NET_PAY_KEYWORDS.some((kw) => next.includes(kw))) {
        break;
      }
      const standalone = next.match(STANDALONE_AMOUNT_PATTERN);
      if (standalone) {
        const amount = parseAmountToken(standalone[1]);
        if (amount !== null) return amount;
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
    const netPay = findAmount(lines, NET_PAY_KEYWORDS, NET_PAY_KEYWORDS);
    if (netPay !== null) {
      return { title: "สลิปเงินเดือน", amount: netPay, type };
    }
  }

  // Pass 1: a line naming the amount explicitly, e.g. "จำนวนเงิน 1,250.00
  // บาท" (same line), or "จำนวนเงิน"/"ยอดเงิน" as its own line with the
  // value 1-2 lines below it (card-style layouts — see LOOKAHEAD_KEYWORDS).
  const labeled = findAmount(lines, AMOUNT_KEYWORDS, LOOKAHEAD_KEYWORDS);
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
