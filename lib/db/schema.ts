import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
// NOTE: this table will be extended in Phase 1 with whatever exact shape
// @auth/drizzle-adapter requires (emailVerified, etc.) once that package is
// installed and its documented schema is checked — do not assume the Auth.js
// column shape here without verifying against the installed adapter version.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: roleEnum("role").notNull().default("MEMBER"),
  lineUserId: varchar("line_user_id", { length: 64 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  categoryId: uuid("category_id").references(() => categories.id),
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

// --- App settings (generic key/value; Rich Menu id, feature flags, etc.) ---

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations (for query-builder joins / `with`) ---------------------------

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  savingsGoals: many(savingsGoals),
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
