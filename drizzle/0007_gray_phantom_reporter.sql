CREATE TYPE "public"."audit_action" AS ENUM('user_invited', 'user_updated', 'user_deactivated', 'user_reactivated', 'user_deleted', 'user_force_reset', 'role_created', 'role_permissions_updated', 'role_deleted');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"actor_label" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"target_label" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");