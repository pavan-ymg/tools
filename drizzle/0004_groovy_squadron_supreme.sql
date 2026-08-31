CREATE TYPE "public"."intake_event_type" AS ENUM('created', 'field_changed', 'stage_changed', 'tl_reviewed', 'assigned');--> statement-breakpoint
CREATE TYPE "public"."intake_stage" AS ENUM('new', 'attempted', 'contacted', 'qualified', 'sent_to_lp', 'confirmed', 'rejected', 'dead');--> statement-breakpoint
CREATE TABLE "intake_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"intake_record_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" "intake_event_type" NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_type" text NOT NULL,
	"owner_id" integer NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"stage" "intake_stage" DEFAULT 'new' NOT NULL,
	"rejection_reason" text,
	"follow_up_at" timestamp with time zone,
	"answers" jsonb NOT NULL,
	"scored_by_tl" boolean DEFAULT false NOT NULL,
	"tl_reviewed_by" integer,
	"tl_reviewed_at" timestamp with time zone,
	"tl_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intake_events" ADD CONSTRAINT "intake_events_intake_record_id_intake_records_id_fk" FOREIGN KEY ("intake_record_id") REFERENCES "public"."intake_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_events" ADD CONSTRAINT "intake_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_tl_reviewed_by_users_id_fk" FOREIGN KEY ("tl_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_events_record_idx" ON "intake_events" USING btree ("intake_record_id");--> statement-breakpoint
CREATE INDEX "intake_records_owner_idx" ON "intake_records" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "intake_records_stage_idx" ON "intake_records" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "intake_records_phone_idx" ON "intake_records" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "intake_records_email_idx" ON "intake_records" USING btree ("email");--> statement-breakpoint
CREATE INDEX "lead_index_phone_idx" ON "lead_index" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "lead_index_email_idx" ON "lead_index" USING btree ("email");