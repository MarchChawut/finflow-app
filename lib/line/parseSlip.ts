// Thai bank transfer slips typically show several numbers (fee, running
// balance, the transferred amount itself), so unlike parseMessage.ts's
// "first number wins" heuristic (fine for a short chat message), this
// anchors on the keywords that actually label the amount on a slip.
export type ParsedSlip = {
  title: string;
  amount: number;
};

const AMOUNT_KEYWORDS = ["จำนวนเงิน", "จำนวน", "ยอดเงิน", "โอนเงิน"];
const NUMBER_PATTERN = /[\d,]+\.\d{2}|[\d,]+/;

export function parseSlipText(rawText: string): ParsedSlip | null {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Pass 1: a line naming the amount explicitly, e.g. "จำนวนเงิน 1,250.00 บาท".
  for (const line of lines) {
    if (AMOUNT_KEYWORDS.some((kw) => line.includes(kw))) {
      const match = line.match(NUMBER_PATTERN);
      if (match) {
        const amount = parseFloat(match[0].replace(/,/g, ""));
        if (amount > 0) {
          return { title: "สลิปโอนเงิน", amount };
        }
      }
    }
  }

  // Pass 2: fall back to a line that's just "123.45 บาท" on its own,
  // common on simpler slip layouts without an explicit label.
  for (const line of lines) {
    if (!line.includes("บาท")) continue;
    const match = line.match(NUMBER_PATTERN);
    if (match) {
      const amount = parseFloat(match[0].replace(/,/g, ""));
      if (amount > 0) {
        return { title: "สลิปโอนเงิน", amount };
      }
    }
  }

  return null;
}
