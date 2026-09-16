// Fuzzy-matches a free-text LINE message against the user's savings goal
// titles by longest common (contiguous) substring — good enough for short
// Thai goal names without pulling in a real NLP/embedding dependency for
// this one feature. Pure function, no I/O, unit-testable in isolation like
// parseMessage.ts/parseSlip.ts.
export type GoalForMatching = {
  id: string;
  title: string;
};

// 4 was tested and found too easy to false-positive on generic short Thai
// words (e.g. "กลาง" alone matching "ส่วนกลางหมู่บ้าน") — 5 still matches
// real cases like "ประกันรถ" while giving a bit more of a safety margin.
// This only ever runs on messages that already passed the savings-keyword
// gate in the webhook, so false positives were already unlikely; this is
// extra margin, not the primary defense.
const MIN_MATCH_LENGTH = 5;
// Common filler prefix on goal titles in this app (see lib/db/seed.ts's
// sample data) that would otherwise dilute the match.
const TITLE_PREFIXES_TO_STRIP = ["ค่า"];

function stripPrefix(title: string): string {
  for (const prefix of TITLE_PREFIXES_TO_STRIP) {
    if (title.startsWith(prefix)) return title.slice(prefix.length);
  }
  return title;
}

function longestCommonSubstringLength(a: string, b: string): number {
  let best = 0;
  let prevRow = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const currRow = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        currRow[j] = prevRow[j - 1] + 1;
        if (currRow[j] > best) best = currRow[j];
      }
    }
    prevRow = currRow;
  }
  return best;
}

/**
 * Returns the goal whose (prefix-stripped) title shares the longest run of
 * characters with `text`, as long as that run clears MIN_MATCH_LENGTH and
 * no other goal ties for the same length (an ambiguous tie is treated the
 * same as "no confident match" — better to ask than guess wrong).
 */
export function findMatchingGoal<T extends GoalForMatching>(
  goals: T[],
  text: string,
): T | null {
  let bestGoal: T | null = null;
  let bestLength = 0;
  let tied = false;

  for (const goal of goals) {
    const key = stripPrefix(goal.title.trim());
    if (!key) continue;

    const length = longestCommonSubstringLength(key, text);
    if (length > bestLength) {
      bestLength = length;
      bestGoal = goal;
      tied = false;
    } else if (length === bestLength && length > 0 && goal.id !== bestGoal?.id) {
      tied = true;
    }
  }

  if (bestLength < MIN_MATCH_LENGTH || tied) return null;
  return bestGoal;
}
