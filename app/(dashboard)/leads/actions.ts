"use server";

import { asc, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";
import { can } from "@/lib/permissions";

const EXPORT_PAGE_SIZE = 200;

export type LeadExportRow = Record<string, string>;

// Paginated by id (stable, unlike offset against leadCreatedAt which can
// tie or shift mid-export as new leads sync in) — same reasoning as
// intake's export, and for the same reason: this can be thousands of
// rows, well past what one call should ever try to build at once under
// Vercel Hobby's ~10s ceiling.
export async function getLeadExportPage(
  afterId: number
): Promise<{ rows: LeadExportRow[]; lastId: number; hasMore: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const userId = Number(session.user.id);
  if (!(await can(userId, "leads.view"))) throw new Error("Not permitted.");

  const page = await db
    .select()
    .from(leadIndex)
    .where(gt(leadIndex.id, afterId))
    .orderBy(asc(leadIndex.id))
    .limit(EXPORT_PAGE_SIZE + 1);

  const hasMore = page.length > EXPORT_PAGE_SIZE;
  const pageRows = hasMore ? page.slice(0, EXPORT_PAGE_SIZE) : page;

  const rows: LeadExportRow[] = pageRows.map((row) => ({
    Name: row.name,
    Phone: row.phone,
    Email: row.email,
    State: row.state,
    "LP Slug": row.slug,
    Time: row.leadCreatedAt.toISOString(),
    Website: row.domain,
  }));

  return {
    rows,
    lastId: pageRows.length > 0 ? pageRows[pageRows.length - 1].id : afterId,
    hasMore,
  };
}
