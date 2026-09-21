CREATE INDEX "goal_allocations_goal_idx" ON "goal_allocations" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "savings_goals_family_visibility_idx" ON "savings_goals" USING btree ("family_id","visibility","created_by_id");--> statement-breakpoint
CREATE INDEX "transactions_family_occurred_idx" ON "transactions" USING btree ("family_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_family_visibility_idx" ON "transactions" USING btree ("family_id","visibility","created_by_id");