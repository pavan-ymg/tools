"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadIndex, leadReveals } from "@/db/schema";
import { can } from "@/lib/permissions";

export async function revealLeadAction(
  leadIndexId: number
): Promise<{ phone: string; email: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const userId = Number(session.user.id);
  if (!(await can(userId, "leads.view"))) {
    return { error: "Not permitted." };
  }

  const [lead] = await db.select().from(leadIndex).where(eq(leadIndex.id, leadIndexId)).limit(1);
  if (!lead) return { error: "Lead not found." };

  // Logged before returning the value, not after — a failure here
  // should block the reveal rather than silently skip the audit trail.
  await db.insert(leadReveals).values({ userId, leadIndexId });

  return { phone: lead.phone, email: lead.email };
}
