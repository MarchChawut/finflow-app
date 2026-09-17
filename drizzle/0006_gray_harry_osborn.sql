-- Hand-edited: drizzle-kit's raw diff would add NOT NULL family_id columns
-- directly (fails on populated tables) and tried to add app_settings' new
-- composite PK before the family_id column existed. Rewritten as: create
-- families + one bootstrap row -> add nullable family_id columns -> backfill
-- every existing row to that bootstrap family -> enforce NOT NULL -> swap
-- app_settings' primary key -> add foreign keys.

CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Bootstrap family for all data that existed before multi-tenancy.
INSERT INTO "families" ("name") VALUES ('FinFlow');
--> statement-breakpoint

ALTER TABLE "app_settings" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "invited_emails" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "family_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "family_id" uuid;
--> statement-breakpoint

UPDATE "app_settings" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "categories" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "invited_emails" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "recurring_bills" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "savings_goals" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "transactions" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint
UPDATE "users" SET "family_id" = (SELECT "id" FROM "families" LIMIT 1);
--> statement-breakpoint

ALTER TABLE "app_settings" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "invited_emails" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "recurring_bills" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "savings_goals" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
-- users.family_id stays nullable — see the comment on that column in
-- lib/db/schema.ts (resolved by auth.ts's signIn callback right after the
-- adapter creates the row, not settable at insert time).

ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_pkey";
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_family_id_key_pk" PRIMARY KEY("family_id","key");
--> statement-breakpoint

ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invited_emails" ADD CONSTRAINT "invited_emails_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;
