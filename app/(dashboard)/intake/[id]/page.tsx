import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intakeRecords, intakeEvents, users } from "@/db/schema";
import { can } from "@/lib/permissions";
import { findMatchingLead } from "@/lib/intake-match";
import type { BeverlyLawAnswers } from "@/lib/forms/beverly-law";
import EditForm from "./EditForm";
import StageForm from "./StageForm";
import TlReviewForm from "./TlReviewForm";
import { updateIntakeAction, changeStageAction, tlReviewAction, setFollowUpAction } from "../actions";
import BackLink from "@/app/(dashboard)/BackLink";

export default async function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const session = await auth();
  const userId = Number(session!.user.id);

  const [record] = await db.select().from(intakeRecords).where(eq(intakeRecords.id, id)).limit(1);
  if (!record) notFound();

  const canView = await can(userId, "intake.view", record.ownerId);
  if (!canView) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to view this record.</p>
      </main>
    );
  }

  const canEdit = await can(userId, "intake.edit", record.ownerId);
  // TL reviewing their own record defeats the point of a second set of
  // eyes — review is only offered when the reviewer isn't the owner.
  const canReview = userId !== record.ownerId && (await can(userId, "intake.review", record.ownerId));

  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, record.ownerId)).limit(1);
  const matchedLead = await findMatchingLead(record.phone, record.email);

  const events = await db
    .select({
      id: intakeEvents.id,
      eventType: intakeEvents.eventType,
      detail: intakeEvents.detail,
      createdAt: intakeEvents.createdAt,
      userName: users.name,
    })
    .from(intakeEvents)
    .innerJoin(users, eq(intakeEvents.userId, users.id))
    .where(eq(intakeEvents.intakeRecordId, id))
    .orderBy(asc(intakeEvents.createdAt));

  const answers = record.answers as BeverlyLawAnswers;
  const boundUpdate = updateIntakeAction.bind(null, id);
  const boundStage = changeStageAction.bind(null, id);
  const boundReview = tlReviewAction.bind(null, id);
  const boundFollowUp = setFollowUpAction.bind(null, id);
  // datetime-local wants "YYYY-MM-DDTHH:mm", no timezone suffix. Server
  // and viewer clocks can differ, same caveat as anywhere else this app
  // shows a raw date — not worth a client component just for this field.
  const followUpLocalValue = record.followUpAt ? record.followUpAt.toISOString().slice(0, 16) : "";

  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <BackLink href={`/intake?form=${record.formType}`} label="Back to records" />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{answers.fullName || "(no name)"}</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Owner: {owner?.name} · {record.phone} · {record.email}
        </p>

        {matchedLead ? (
          <p style={{ fontSize: 13, color: "var(--success)", marginTop: 8 }}>
            ✓ LP form received — matched lead from {matchedLead.domain} ({matchedLead.slug}), submitted{" "}
            {matchedLead.leadCreatedAt.toLocaleDateString()}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
            No matching LP form submission yet.
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        <StageForm currentStage={record.stage} action={boundStage} />

        {canEdit && (
          <form
            action={boundFollowUp}
            style={{ display: "flex", alignItems: "flex-end", gap: 10, border: "1px solid var(--glass-border)", borderRadius: 8, padding: 16 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Follow-up</span>
              <input
                type="datetime-local"
                name="followUpAt"
                defaultValue={followUpLocalValue}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)" }}
              />
            </label>
            <button
              type="submit"
              style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--accent)", color: "var(--accent-text)", fontWeight: 500, cursor: "pointer" }}
            >
              Save
            </button>
          </form>
        )}

        {canReview && (
          <TlReviewForm scoredByTl={record.scoredByTl} tlComment={record.tlComment} action={boundReview} />
        )}
      </div>

      {canEdit ? (
        <EditForm answers={answers} action={boundUpdate} />
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          You can view this record but don&apos;t have permission to edit it.
        </p>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>History</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map((e) => (
            <p key={e.id} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {e.createdAt.toLocaleString()} — {e.userName} — {e.eventType} —{" "}
              {JSON.stringify(e.detail)}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
