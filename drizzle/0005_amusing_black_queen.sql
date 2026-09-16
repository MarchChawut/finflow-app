CREATE TABLE "user_budget_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"income" numeric(12, 2),
	"parts" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_budget_settings" ADD CONSTRAINT "user_budget_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;