import { eq, and, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { intakeRecords } from "@/db/schema";
import { getScope, subordinateIds } from "@/lib/permissions";

/**
 * Count of intake records overdue for follow-up, within whatever scope
 * intake.view grants this user (own/team/all) — same rule the Intake
 * Records list itself filters by. Shared by the nav badge and the
 * dashboard's stat card so the two numbers can never drift apart.
 * Returns null if the user can't view intake at all.
 */
export async function getDueFollowUpCount(userId: number): Promise<number | null> {
  const scope = await getScope(userId, "intake.view");
  if (!scope) return null;

  const scopeFilter =
    scope === "own"
      ? eq(intakeRecords.ownerId, userId)
      : scope === "team"
        ? inArray(intakeRecords.ownerId, [userId, ...(await subordinateIds(userId))])
        : undefined;

  const filters = [isNotNull(intakeRecords.followUpAt), lte(intakeRecords.followUpAt, new Date()), scopeFilter].filter(
    (f): f is NonNullable<typeof f> => f !== undefined
  );

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(intakeRecords)
    .where(and(...filters));

  return row?.count ?? 0;
}
