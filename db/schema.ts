import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
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
  passwordHash: text("password_hash").notNull(),
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
