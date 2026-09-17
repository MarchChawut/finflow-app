import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// At-rest encryption for per-family LINE OA credentials (lib/db/schema.ts's
// families.lineChannelAccessTokenEncrypted/lineChannelSecretEncrypted) — once
// hosts self-enter these into a shared DB (unlike the old single env var,
// which only the app operator ever saw), a DB leak or query bug should not
// hand over every family's real LINE credentials in plaintext.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended nonce length for GCM

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — generate one with: openssl rand -base64 32");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (openssl rand -base64 32)");
  }
  return key;
}

// Format: "<iv>.<authTag>.<ciphertext>", each base64.
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed ciphertext — expected '<iv>.<authTag>.<ciphertext>'");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
