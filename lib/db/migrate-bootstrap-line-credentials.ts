// One-off: encrypts the still-global LINE_CHANNEL_ACCESS_TOKEN/LINE_CHANNEL_SECRET
// env vars (and copies the two NEXT_PUBLIC_LIFF_ID* vars as plaintext) onto the
// single existing bootstrap "FinFlow" family row, so the already-working LINE OA
// integration doesn't regress once per-family credentials become the real source
// of truth (see lib/actions/lineCredentials.ts). Safe to run more than once —
// only fills columns that are still null, never overwrites a value a host has
// since configured via Settings.
//
// Run with: pnpm db:migrate-line-credentials
//
// Same standalone-connection pattern as lib/db/seed.ts, for the same reason:
// lib/db/index.ts AND lib/crypto/encryption.ts both have `import "server-only"`,
// which only Next's bundler special-cases — plain `tsx`/Node throws on it. So
// this script duplicates the tiny encrypt/decrypt implementation locally
// rather than importing lib/crypto/encryption.ts — keep the two in sync if
// either changes.
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, isNull, or } from "drizzle-orm";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import * as schema from "./schema";
import { families } from "./schema";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set — generate one with: openssl rand -base64 32");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]).toString("utf8");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  // Sanity check the encryption round-trip before touching real rows —
  // guards against ENCRYPTION_KEY being misconfigured in a way that would
  // silently store garbage.
  const probe = "round-trip-check";
  const encrypted = encrypt(probe);
  if (encrypted === probe || decrypt(encrypted) !== probe) {
    throw new Error("Encryption round-trip check failed — verify ENCRYPTION_KEY before proceeding.");
  }

  const [existingFamily] = await db
    .select()
    .from(families)
    .where(
      or(
        isNull(families.lineChannelAccessTokenEncrypted),
        isNull(families.lineChannelSecretEncrypted),
      ),
    )
    .limit(1);

  if (!existingFamily) {
    console.log("No family with unset LINE credentials found — nothing to backfill.");
    process.exit(0);
  }

  const {
    LINE_CHANNEL_ACCESS_TOKEN,
    LINE_CHANNEL_SECRET,
    NEXT_PUBLIC_LIFF_ID,
    NEXT_PUBLIC_LIFF_ID_QUICK_RECORD,
  } = process.env;

  const set: Partial<typeof families.$inferInsert> = {};
  if (!existingFamily.lineChannelAccessTokenEncrypted && LINE_CHANNEL_ACCESS_TOKEN) {
    set.lineChannelAccessTokenEncrypted = encrypt(LINE_CHANNEL_ACCESS_TOKEN);
  }
  if (!existingFamily.lineChannelSecretEncrypted && LINE_CHANNEL_SECRET) {
    set.lineChannelSecretEncrypted = encrypt(LINE_CHANNEL_SECRET);
  }
  if (!existingFamily.liffId && NEXT_PUBLIC_LIFF_ID) {
    set.liffId = NEXT_PUBLIC_LIFF_ID;
  }
  if (!existingFamily.liffIdQuickRecord && NEXT_PUBLIC_LIFF_ID_QUICK_RECORD) {
    set.liffIdQuickRecord = NEXT_PUBLIC_LIFF_ID_QUICK_RECORD;
  }

  if (Object.keys(set).length === 0) {
    console.log("Nothing to backfill (env vars empty or already set on the family row).");
    process.exit(0);
  }

  await db.update(families).set(set).where(eq(families.id, existingFamily.id));

  console.log(`Backfilled family ${existingFamily.id} (${existingFamily.name ?? "unnamed"}):`, Object.keys(set));
  process.exit(0);
}

main().catch((err) => {
  console.error("Bootstrap LINE credentials migration failed:", err);
  process.exit(1);
});
