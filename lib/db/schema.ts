import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  timestamp,
  doublePrecision,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// --- Enums -------------------------------------------------------------

export const roleEnum = pgEnum("role", ["ADMIN", "MEMBER"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);
export const channelEnum = pgEnum("channel", [
  "DASHBOARD",
  "LINE_CHAT",
  "LIFF_FORM",
  "SLIP_OCR",
]);

// --- Families (multi-tenant boundary — one family = one household, its own
// LINE OA once Phase 2 lands, its own data) ---------------------------------

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  // Public path segment for this family's LINE webhook — deliberately a
  // separate random value from `id`, not the real PK: a leaked/pasted
  // webhook URL can be invalidated by regenerating this one column with no
  // FK cascade, versus rotating `id` which cascades through the whole schema.
  webhookSlug: uuid("webhook_slug").notNull().unique().defaultRandom(),
  // LINE OA credentials, per family (Phase 2). Ciphertext (see
  // lib/crypto/encryption.ts) — null until the family's host fills in the
  // Settings form. LIFF ids stay plaintext: they were already shipped
  // client-side via NEXT_PUBLIC_ env vars before this migration, so they're
  // not secret the way the token/secret are.
  lineChannelAccessTokenEncrypted: text("line_channel_access_token_encrypted"),
  lineChannelSecretEncrypted: text("line_channel_secret_encrypted"),
  liffId: text("liff_id"),
  liffIdQuickRecord: text("liff_id_quick_record"),
  // Phase 5 — Gemini AI coach, per family, same encrypt-at-rest reasoning as
  // the LINE credentials above. Null until the family's host fills in the
  // Settings form; no shared/global fallback key.
  geminiApiKeyEncrypted: text("gemini_api_key_encrypted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Users ---------------------------------------------------------------
// Shape verified against the installed `@auth/drizzle-adapter@1.11.3`'s
// `lib/pg.js` (`defineTables`/`PostgresDrizzleAdapter`): the adapter only
// requires JS property names `id`/`name`/`email`/`emailVerified`/`image` on
// whatever custom `usersTable` we pass in — column *names* and extra columns
// (role, lineUserId, createdAt) are entirely up to us. `id` keeps its
// `.defaultRandom()`: the adapter checks `hasDefault` on the id column and,
// when true, omits `id` from its insert and lets Postgres generate the uuid
// itself (see `createUser` in pg.js), so no id-format mismatch.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Auth.js sets this on sign-in for providers that verify email (Google
  // does). Not used for authorization logic — kept only for adapter shape.
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: roleEnum("role").notNull().default("MEMBER"),
  // Unique per-family, not globally: once each family can register its own
  // independent LINE OA channel (Phase 2), two families' channels have
  // separate LINE userId namespaces, so a global unique constraint would
  // wrongly block a legitimate second bind. See the composite unique index
  // below. Postgres treats NULLs as distinct, so pre-resolution rows
  // (familyId/lineUserId both still null) never spuriously collide.
  lineUserId: varchar("line_user_id", { length: 64 }),
  // Nullable at the DB level ONLY because the DrizzleAdapter's createUser
  // insert doesn't know about this column — auth.ts's signIn callback
  // resolves it (join an invited family, or create a new one as its host)
  // immediately after the row is created, before sign-in completes. Every
  // *other* family-scoped table below is NOT NULL: those rows are only ever
  // created by our own app code, always after a user already has a
  // resolved familyId.
  familyId: uuid("family_id").references(() => families.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.familyId, t.lineUserId)]);

// --- Auth.js tables (accounts/sessions/verificationTokens) ---------------
// JS property names below must match what @auth/drizzle-adapter's
// PostgresDrizzleAdapter accesses on these tables (userId, sessionToken,
// providerAccountId, etc.) — the adapter reads them by property, not by
// underlying SQL column name, so column names can stay snake_case to match
// the rest of this schema while the JS keys stay camelCase as required.

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

// --- Categories ------------------------------------------------------------

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  type: transactionTypeEnum("type").notNull(),
});

// --- Transactions ------------------------------------------------------------

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  channel: channelEnum("channel").notNull().default("DASHBOARD"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  // "set null" so deleting a category (Settings → categories management)
  // just untags any transactions that used it, rather than failing the
  // delete or cascading into losing real financial history.
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => users.id),
  // Raw LINE userId at time of capture — kept even before/without an app User binding.
  lineUserId: varchar("line_user_id", { length: 64 }),
  // Slip OCR audit trail.
  rawSlipUrl: text("raw_slip_url"),
  ocrConfidence: doublePrecision("ocr_confidence"),
});

// --- Savings goals ------------------------------------------------------------

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  icon: text("icon"),
  color: text("color"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Recurring monthly bills (water/electric/phone/insurance/...) ----------

export const recurringBills = pgTable("recurring_bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").references(() => users.id),
  // Compared against the 1st of the current month to know whether "จ่ายแล้ว"
  // should be shown as done or pressable again — no cron/reset job needed,
  // it just naturally flips back once a new month starts.
  lastPaidAt: timestamp("last_paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Per-user budget-ratio calculator settings (income + saved ratio) -----

export const userBudgetSettings = pgTable("user_budget_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  income: numeric("income", { precision: 12, scale: 2 }),
  // JSON string of {label, percent}[] — kept as a string like app_settings'
  // values, since the shape is small and free-form (variable part count).
  parts: text("parts").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- App settings (generic key/value; Rich Menu id, feature flags, etc.) ---
// Composite (familyId, key) primary key — each family has its own value for
// a given key (e.g. "savings_reminder_enabled" is per-family, not global).

export const appSettings = pgTable(
  "app_settings",
  {
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.key] })],
);

// --- Invited emails (DB-backed sign-in allowlist — which family a pending
// invite joins once that email signs in; see auth.ts's signIn callback) ----

export const invitedEmails = pgTable("invited_emails", {
  email: text("email").primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  invitedById: uuid("invited_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations (for query-builder joins / `with`) ---------------------------

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  savingsGoals: many(savingsGoals),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [transactions.createdById],
    references: [users.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  createdBy: one(users, {
    fields: [savingsGoals.createdById],
    references: [users.id],
  }),
}));
