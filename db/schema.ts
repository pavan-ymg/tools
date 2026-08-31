import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// Scope: how far a granted permission reaches.
// own  -> only records this user owns
// team -> this user's reporting subtree (see usersRelations.managerId)
// all  -> everyone
export const scopeEnum = pgEnum("scope", ["own", "team", "all"]);

export const tokenTypeEnum = pgEnum("token_type", ["invite", "reset"]);

// Source of truth for identity is HRMS; hrmsEmployeeId is the sync key.
// manager_id is a self-reference — this is the whole reporting hierarchy.
// Adding a Director layer later is one new row + re-pointing manager_id,
// never a schema change.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  hrmsEmployeeId: text("hrms_employee_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // Null = invited but hasn't accepted yet (pending). Set once, on
  // invite acceptance. authorize() must treat a null hash as "cannot
  // log in", never attempt bcrypt.compare against it.
  passwordHash: text("password_hash"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  // Set on bootstrap/admin-force-reset; the dashboard layout checks this
  // fresh on every request and redirects to /change-password (§3.6.3).
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  // Bumped on every password change. Carried in the JWT at login time and
  // compared against the live DB value on each dashboard request — a
  // mismatch means "this token predates a password change" and forces a
  // fresh login. This is what makes "invalidate all sessions on password
  // change" (§3.6.2) actually true for JWT sessions, which have no
  // server-side session store to revoke directly.
  sessionVersion: integer("session_version").notNull().default(0),
  // Reserved for future MFA (§3.6.3) — not used in v1.
  mfaSecret: text("mfa_secret"),
  // Exponential backoff after repeated bad passwords (§3.6.3: "not a
  // permanent lock"). failedLoginCount resets to 0 on any successful
  // login; lockedUntil self-expires rather than needing an admin to
  // clear it — see authorize() in lib/auth.ts.
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  // Weekly lead-count goal for the leaderboard's Target column. Null =
  // no target set — shown as "—", not 0, since 0 would read as "handle
  // nothing this week" rather than "not configured".
  weeklyTarget: integer("weekly_target"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
]);

// Roles are fully user-composed (Director, HR, QA, ...) — only the
// is_system row (super_admin) is protected from deletion/rename.
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("roles_slug_idx").on(table.slug),
]);

// The permission catalogue is developer-defined and seeded via migration —
// super admin attaches these to roles but can never invent a new key here.
// A key only does something if application code checks it.
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  description: text("description").notNull(),
}, (table) => [
  uniqueIndex("permissions_key_idx").on(table.key),
]);

export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  scope: scopeEnum("scope").notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
]);

export const userRoles = pgTable("user_roles", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

// Backs invite links, password resets, and any future magic-link flow —
// one table, one shape: hash the token, never store it plain (§3.6.2).
export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  type: tokenTypeEnum("type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("auth_tokens_hash_idx").on(table.tokenHash),
]);

// The Lead Feed's data source (§5.1/§5.2, plan §3.2). Populated by the
// tools app PULLING from core-api's read-only GET /internal/leads?since=
// endpoint and upserting here — core-api never writes to this table or
// even knows it exists. sourceId is the original Mongo _id (globally
// unique), so upserts are idempotent and this table doubles as the
// backfill target. Also what the Call Intake "LP form received" badge
// (§6.3) matches against by phone/email.
export const leadIndex = pgTable("lead_index", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  domain: text("domain").notNull(),
  slug: text("slug").notNull(),
  state: text("state").notNull().default(""),
  leadCreatedAt: timestamp("lead_created_at", { withTimezone: true }).notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lead_index_source_id_idx").on(table.sourceId),
  // Backs the LP-match lookup (§6.3) — checked fresh on every intake
  // record view, not stored, so a lead arriving AFTER the call is still
  // caught (see lib/intake-match.ts).
  index("lead_index_phone_idx").on(table.phone),
  index("lead_index_email_idx").on(table.email),
]);

// Contact fields on the Lead Feed are masked by default, reveal-on-click
// (§5.3 — PII on an internet-facing page). Every reveal is logged here,
// never deleted, so "who looked at this lead's number" is answerable.
export const leadReveals = pgTable("lead_reveals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leadIndexId: integer("lead_index_id").notNull().references(() => leadIndex.id, { onDelete: "cascade" }),
  revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Call Intake (§6). "Rejected" requires a reason code (§6.2 — what turns
// "worth it or not" into analysable data instead of an agent's opinion).
export const intakeStageEnum = pgEnum("intake_stage", [
  "new", "attempted", "contacted", "qualified", "sent_to_lp", "confirmed", "rejected", "dead",
]);

// One wrapper table for every form type, not one table per form (§6.6 —
// "developer builds each form" means the UI/validation per formType, not
// a new physical table each time). Form-specific fields live in
// `answers`; phone/email are pulled out as real columns because the
// LP-match (§6.3) and future dedup checks need to query them directly —
// reaching into JSONB for that would be slow and unindexable in
// practice.
export const intakeRecords = pgTable("intake_records", {
  id: serial("id").primaryKey(),
  formType: text("form_type").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  stage: intakeStageEnum("stage").notNull().default("new"),
  rejectionReason: text("rejection_reason"),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  // The form's actual fields (Claimant Information, accident details,
  // etc. for form #1) — shape depends on formType, validated in code
  // against a per-formType schema, not enforced by the database.
  answers: jsonb("answers").notNull(),
  // TL review (§6 flow: agent works it -> TL confirms scored or not).
  scoredByTl: boolean("scored_by_tl").notNull().default(false),
  tlReviewedBy: integer("tl_reviewed_by").references(() => users.id),
  tlReviewedAt: timestamp("tl_reviewed_at", { withTimezone: true }),
  tlComment: text("tl_comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("intake_records_owner_idx").on(table.ownerId),
  index("intake_records_stage_idx").on(table.stage),
  index("intake_records_phone_idx").on(table.phone),
  index("intake_records_email_idx").on(table.email),
]);

// Immutable audit trail (§6.5) — required, not optional, because
// managers can edit other people's records and the leaderboard (Phase 3)
// is computed from this same history. Never updated or deleted; a
// correction is a new event, not an edit to an old one.
export const intakeEventTypeEnum = pgEnum("intake_event_type", [
  "created", "field_changed", "stage_changed", "tl_reviewed", "assigned",
]);

export const intakeEvents = pgTable("intake_events", {
  id: serial("id").primaryKey(),
  intakeRecordId: integer("intake_record_id").notNull().references(() => intakeRecords.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  eventType: intakeEventTypeEnum("event_type").notNull(),
  // Flexible payload — shape depends on eventType, e.g. for
  // stage_changed: { from: "new", to: "contacted" }.
  detail: jsonb("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("intake_events_record_idx").on(table.intakeRecordId),
]);

// Admin action audit trail — who did what to which user/role, when.
// Built after a real incident (2026-09-01): a Manager deleted the
// super_admin account with zero record of it happening. Deliberately
// NOT foreign-keyed to users on either side — the whole point is
// surviving the deletion of the very account it's logging, so both
// actor and target are captured as plain ids + a name/email snapshot
// taken at write time, not a live join that breaks once someone's gone.
export const auditActionEnum = pgEnum("audit_action", [
  "user_invited", "user_updated", "user_deactivated", "user_reactivated", "user_deleted", "user_force_reset",
  "role_created", "role_permissions_updated", "role_deleted",
]);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(),
  actorLabel: text("actor_label").notNull(),
  action: auditActionEnum("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  targetLabel: text("target_label").notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_log_created_idx").on(table.createdAt),
]);
