CREATE TABLE "lead_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"domain" text NOT NULL,
	"slug" text NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"lead_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_index_source_id_idx" ON "lead_index" USING btree ("source_id");