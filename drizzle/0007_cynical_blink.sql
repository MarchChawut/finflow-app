ALTER TABLE "users" DROP CONSTRAINT "users_line_user_id_unique";--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "webhook_slug" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "line_channel_access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "line_channel_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "liff_id" text;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "liff_id_quick_record" text;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_webhook_slug_unique" UNIQUE("webhook_slug");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_family_id_line_user_id_unique" UNIQUE("family_id","line_user_id");