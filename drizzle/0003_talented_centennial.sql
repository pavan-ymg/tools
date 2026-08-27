CREATE TABLE "lead_reveals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lead_index_id" integer NOT NULL,
	"revealed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_reveals" ADD CONSTRAINT "lead_reveals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_reveals" ADD CONSTRAINT "lead_reveals_lead_index_id_lead_index_id_fk" FOREIGN KEY ("lead_index_id") REFERENCES "public"."lead_index"("id") ON DELETE cascade ON UPDATE no action;