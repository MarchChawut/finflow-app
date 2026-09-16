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
  lineUserId: varchar("line_user_id", { length: 64 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  type: transactionTypeEnum("type").notNull(),
});

// --- Transactions ------------------------------------------------------------

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
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

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Invited emails (DB-backed sign-in allowlist, additive to the
// ADMIN_ALLOWED_EMAILS env var bootstrap list in auth.ts) --------------------

export const invitedEmails = pgTable("invited_emails", {
  email: text("email").primaryKey(),
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
