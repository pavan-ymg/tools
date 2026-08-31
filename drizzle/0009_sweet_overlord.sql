CREATE TYPE "public"."override_scope" AS ENUM('own', 'team', 'all', 'none');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'user_permissions_overridden';--> statement-breakpoint
CREATE TABLE "user_permission_overrides" (
	"user_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"scope" "override_scope" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_permission_overrides_user_id_permission_id_pk" PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;