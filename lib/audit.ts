import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, users, type auditActionEnum } from "@/db/schema";

type AuditAction = (typeof auditActionEnum.enumValues)[number];

// Snapshots the actor's name/email at write time rather than joining
// live — the log has to stay readable even after the actor or target
// account is gone (that's the whole reason it exists).
export async function logAudit(
  actorId: number,
  action: AuditAction,
  targetType: "user" | "role",
  targetId: number | null,
  targetLabel: string,
  detail?: Record<string, unknown>
): Promise<void> {
  const [actor] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actorId)).limit(1);
  const actorLabel = actor ? `${actor.name} (${actor.email})` : `User #${actorId}`;

  await db.insert(auditLog).values({
    actorId,
    actorLabel,
    action,
    targetType,
    targetId,
    targetLabel,
    detail: detail ?? null,
  });
}
