import "server-only";
import { GoogleGenAI } from "@google/genai";
import { decrypt } from "@/lib/crypto/encryption";

// Named export, not a bare string in the action file — Google's flash-tier
// models get retired/renamed roughly every 6-12 months, so this is the one
// place to bump later. gemini-2.5-flash: best price/performance for
// low-latency reasoning tasks, appropriate for a few short paragraphs of
// advice (no need for the pricier gemini-3.8-flash's extra reasoning depth).
export const COACH_MODEL = "gemini-2.5-flash";

// Mirrors lib/line/clientForFamily.ts's shape/reasoning: built fresh per
// call (not cached), so a key rotation in Settings takes effect immediately.
// Returns null both when unconfigured AND when decrypt() throws (corrupted
// ciphertext, or after an ENCRYPTION_KEY rotation) — callers only need to
// branch on "do I have a working client," not on why they don't.
export function getGeminiClientForFamily(apiKeyEncrypted: string | null): GoogleGenAI | null {
  if (!apiKeyEncrypted) return null;

  let apiKey: string;
  try {
    apiKey = decrypt(apiKeyEncrypted);
  } catch (err) {
    console.error("[gemini] failed to decrypt family's API key:", err);
    return null;
  }

  return new GoogleGenAI({ apiKey });
}
