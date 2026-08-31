import { db } from "@/lib/db";
import { intakeEvents } from "@/db/schema";

type EventType = "created" | "field_changed" | "stage_changed" | "tl_reviewed" | "assigned";

// One insert, one place — every intake mutation goes through this so
// the audit trail (§6.5) can't drift out of sync with what actually
// happened. Events are never updated or deleted; a correction is a new
// event.
export async function logIntakeEvent(
  intakeRecordId: number,
  userId: number,
  eventType: EventType,
  detail: Record<string, unknown>
) {
  await db.insert(intakeEvents).values({ intakeRecordId, userId, eventType, detail });
}
