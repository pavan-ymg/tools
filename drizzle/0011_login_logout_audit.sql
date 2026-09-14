ALTER TYPE "public"."audit_action" ADD VALUE 'login' BEFORE 'user_invited';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'logout' BEFORE 'user_invited';
