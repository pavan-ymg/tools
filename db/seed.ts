/**
 * Idempotent seed: the developer-defined permission catalogue (§3.5 —
 * super admin can attach these to roles but never invent new keys),
 * starter roles, and their default grants.
 *
 * Also bootstraps the first super admin from env vars, since nobody
 * exists yet to send them an invite (§3.6.3). This step REFUSES to run
 * if any user already exists, so it can never be re-triggered later to
 * mint a second super admin outside the normal invite flow.
 *
 * Run with: npm run db:seed
 */
// Run via `npm run db:seed`, which passes --env-file=.env.local to tsx.
// (A plain top-level dotenv import here doesn't work: ES module imports
// are hoisted, so @/lib/db's own top-level neon() call would still run
// before dotenv had a chance to set DATABASE_URL.)
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, roles, permissions, rolePermissions, userRoles } from "@/db/schema";

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: "leads.view", description: "View the lead feed" },
  { key: "intake.create", description: "Create a call-intake record" },
  { key: "intake.edit", description: "Edit a call-intake record" },
  { key: "intake.review", description: "TL review — score/comment on intake records" },
  { key: "intake.export", description: "Bulk export intake records" },
  { key: "leaderboard.view", description: "View the performance leaderboard" },
  { key: "roles.manage", description: "Create/edit roles and their permissions" },
  { key: "users.manage", description: "Invite users, assign roles, edit the reporting tree" },
];

type StarterRole = {
  slug: string;
  name: string;
  isSystem: boolean;
  grants: Array<{ key: string; scope: "own" | "team" | "all" }>;
};

// Starting configuration only — Pavan edits all of this live in the
// admin UI once it exists (§3.5). Nothing here is hardcoded behaviour.
const STARTER_ROLES: StarterRole[] = [
  { slug: "super_admin", name: "Super Admin", isSystem: true, grants: [] }, // bypasses checks in code
  {
    slug: "manager",
    name: "Manager",
    isSystem: false,
    grants: [
      { key: "leads.view", scope: "all" },
      { key: "intake.create", scope: "all" },
      { key: "intake.edit", scope: "all" },
      { key: "intake.review", scope: "all" },
      { key: "intake.export", scope: "all" },
      { key: "leaderboard.view", scope: "all" },
    ],
  },
  {
    slug: "teamlead",
    name: "Team Lead",
    isSystem: false,
    grants: [
      { key: "leads.view", scope: "all" },
      { key: "intake.create", scope: "team" },
      { key: "intake.edit", scope: "team" },
      { key: "intake.review", scope: "team" },
      { key: "leaderboard.view", scope: "team" },
    ],
  },
  {
    slug: "employee",
    name: "Agent",
    isSystem: false,
    grants: [
      { key: "leads.view", scope: "all" },
      { key: "intake.create", scope: "own" },
      { key: "intake.edit", scope: "own" },
      { key: "leaderboard.view", scope: "own" },
    ],
  },
];

async function seedCatalogue() {
  for (const p of PERMISSIONS) {
    await db.insert(permissions).values(p).onConflictDoNothing({ target: permissions.key });
  }

  for (const role of STARTER_ROLES) {
    await db
      .insert(roles)
      .values({ slug: role.slug, name: role.name, isSystem: role.isSystem })
      .onConflictDoNothing({ target: roles.slug });

    if (role.grants.length === 0) continue;

    const [roleRow] = await db.select().from(roles).where(eq(roles.slug, role.slug)).limit(1);
    for (const grant of role.grants) {
      const [permRow] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.key, grant.key))
        .limit(1);
      if (!roleRow || !permRow) continue;

      await db
        .insert(rolePermissions)
        .values({ roleId: roleRow.id, permissionId: permRow.id, scope: grant.scope })
        .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
    }
  }

  console.log(`Seeded ${PERMISSIONS.length} permissions, ${STARTER_ROLES.length} roles.`);
}

async function bootstrapSuperAdmin() {
  const [{ count }] = await db.execute(sql`SELECT count(*)::int AS count FROM users`).then(
    (r) => r.rows as Array<{ count: number }>
  );

  if (count > 0) {
    console.log("Users already exist — skipping super admin bootstrap.");
    return;
  }

  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    console.log(
      "No users exist yet, but BOOTSTRAP_SUPER_ADMIN_EMAIL / _PASSWORD are not set — skipping."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      isActive: true,
      // This password sat in a plaintext env var — force it to be
      // replaced with one only the account holder knows (§3.6.3).
      mustChangePassword: true,
    })
    .returning();

  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.slug, "super_admin"))
    .limit(1);

  if (superAdminRole) {
    await db.insert(userRoles).values({ userId: user.id, roleId: superAdminRole.id });
  }

  console.log(`Bootstrapped super admin: ${email}. Change this password on first login.`);
}

async function main() {
  await seedCatalogue();
  await bootstrapSuperAdmin();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
