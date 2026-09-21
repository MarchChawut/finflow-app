CREATE TYPE "public"."allocation_type" AS ENUM('AMOUNT', 'PERCENT');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('PERSONAL', 'FAMILY');--> statement-breakpoint
CREATE TABLE "goal_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" "allocation_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "visibility" "visibility" DEFAULT 'FAMILY' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "visibility" "visibility" DEFAULT 'FAMILY' NOT NULL;--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;