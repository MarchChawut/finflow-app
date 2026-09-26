ALTER TABLE "transactions" ADD COLUMN "is_savings_sweep" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "salary_received_at" timestamp with time zone;