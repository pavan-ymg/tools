CREATE INDEX "intake_records_form_created_idx" ON "intake_records" USING btree ("form_type","created_at");--> statement-breakpoint
CREATE INDEX "intake_records_follow_up_idx" ON "intake_records" USING btree ("follow_up_at");--> statement-breakpoint
CREATE INDEX "intake_records_created_idx" ON "intake_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_index_created_idx" ON "lead_index" USING btree ("lead_created_at");