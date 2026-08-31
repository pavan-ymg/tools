"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intakeRecords } from "@/db/schema";
import { can } from "@/lib/permissions";
import { logIntakeEvent } from "@/lib/intake-events";
import { beverlyLawSchema, BEVERLY_LAW_SECTIONS, type BeverlyLawAnswers } from "@/lib/forms/beverly-law";

const CHECKBOX_FIELDS = new Set(
  BEVERLY_LAW_SECTIONS.flatMap((s) => s.fields).filter((f) => f.type === "checkbox").map((f) => f.name)
);

function formDataToAnswers(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const section of BEVERLY_LAW_SECTIONS) {
    for (const field of section.fields) {
      obj[field.name] = CHECKBOX_FIELDS.has(field.name)
        ? formData.get(field.name) === "on"
        : (formData.get(field.name) ?? "");
    }
  }
  return obj;
}

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return Number(session.user.id);
}

export async function createIntakeAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const userId = await requireUserId();
  if (!(await can(userId, "intake.create"))) return "Not permitted.";

  const parsed = beverlyLawSchema.safeParse(formDataToAnswers(formData));
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }

  const [record] = await db
    .insert(intakeRecords)
    .values({
      formType: "beverly_law",
      ownerId: userId,
      phone: parsed.data.phone,
      email: parsed.data.email,
      answers: parsed.data,
    })
    .returning();

  await logIntakeEvent(record.id, userId, "created", { formType: "beverly_law" });

  redirect(`/intake/${record.id}`);
}

export async function updateIntakeAction(
  id: number,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const userId = await requireUserId();
  const [existing] = await db.select().from(intakeRecords).where(eq(intakeRecords.id, id)).limit(1);
  if (!existing) return "Record not found.";
  if (!(await can(userId, "intake.edit", existing.ownerId))) return "Not permitted.";

  const parsed = beverlyLawSchema.safeParse(formDataToAnswers(formData));
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }

  const before = existing.answers as BeverlyLawAnswers;
  const changedFields = Object.keys(parsed.data).filter(
    (key) => before[key as keyof BeverlyLawAnswers] !== parsed.data[key as keyof BeverlyLawAnswers]
  );

  await db
    .update(intakeRecords)
    .set({
      phone: parsed.data.phone,
      email: parsed.data.email,
      answers: parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(intakeRecords.id, id));

  if (changedFields.length > 0) {
    await logIntakeEvent(id, userId, "field_changed", { changedFields });
  }

  redirect(`/intake/${id}`);
}

const STAGES = ["new", "attempted", "contacted", "qualified", "sent_to_lp", "confirmed", "rejected", "dead"] as const;

export async function changeStageAction(
  id: number,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const userId = await requireUserId();
  const [existing] = await db.select().from(intakeRecords).where(eq(intakeRecords.id, id)).limit(1);
  if (!existing) return "Record not found.";
  if (!(await can(userId, "intake.edit", existing.ownerId))) return "Not permitted.";

  const newStage = formData.get("stage") as string;
  if (!STAGES.includes(newStage as (typeof STAGES)[number])) return "Invalid stage.";

  const rejectionReason = (formData.get("rejectionReason") as string) || "";
  if (newStage === "rejected" && !rejectionReason.trim()) {
    // Required per §6.2 — this is what turns "worth it or not" into
    // analysable data instead of just the agent's say-so.
    return "A rejection reason is required.";
  }

  await db
    .update(intakeRecords)
    .set({
      stage: newStage as (typeof STAGES)[number],
      rejectionReason: newStage === "rejected" ? rejectionReason : null,
      updatedAt: new Date(),
    })
    .where(eq(intakeRecords.id, id));

  await logIntakeEvent(id, userId, "stage_changed", {
    from: existing.stage,
    to: newStage,
    ...(newStage === "rejected" ? { rejectionReason } : {}),
  });

  redirect(`/intake/${id}`);
}

export async function setFollowUpAction(id: number, formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const [existing] = await db.select().from(intakeRecords).where(eq(intakeRecords.id, id)).limit(1);
  if (!existing || !(await can(userId, "intake.edit", existing.ownerId))) return;

  const followUpAt = formData.get("followUpAt") as string;
  await db
    .update(intakeRecords)
    .set({ followUpAt: followUpAt ? new Date(followUpAt) : null, updatedAt: new Date() })
    .where(eq(intakeRecords.id, id));

  await logIntakeEvent(id, userId, "field_changed", { changedFields: ["followUpAt"] });
}

export async function tlReviewAction(
  id: number,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const userId = await requireUserId();
  const [existing] = await db.select().from(intakeRecords).where(eq(intakeRecords.id, id)).limit(1);
  if (!existing) return "Record not found.";
  // TL scope: 'team' — reviewer must be the owner's manager (or above),
  // not the owner themselves reviewing their own work.
  if (!(await can(userId, "intake.review", existing.ownerId))) return "Not permitted.";

  const scored = formData.get("scored") === "on";
  const comment = (formData.get("comment") as string) || "";

  await db
    .update(intakeRecords)
    .set({
      scoredByTl: scored,
      tlReviewedBy: userId,
      tlReviewedAt: new Date(),
      tlComment: comment,
      updatedAt: new Date(),
    })
    .where(eq(intakeRecords.id, id));

  await logIntakeEvent(id, userId, "tl_reviewed", { scored, comment });

  redirect(`/intake/${id}`);
}
