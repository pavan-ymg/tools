import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";
import { fetchLeadsSince } from "@/lib/core-api";

// No stored cursor table on purpose — the sync point is just "the
// newest lead we already have," derived from the data itself. Self-
// healing if this table is ever emptied (a full backfill just happens
// again), and combined with the upsert-by-sourceId below, re-fetching
// a lead we already have is a harmless no-op rather than a duplicate.
async function getSyncCursor(): Promise<Date> {
  const result = await db.execute(sql`SELECT MAX(lead_created_at) AS max FROM lead_index`);
  const row = (result.rows as Array<{ max: string | null }>)[0];
  return row?.max ? new Date(row.max) : new Date(0);
}

/**
 * Pull anything new from core-api and upsert it into lead_index.
 * Called on-demand when the Lead Feed page loads (§3.2 — no cron, since
 * Vercel Hobby caps cron at ~daily anyway; on-demand is fresher besides).
 * Safe to call repeatedly/concurrently: upserts are idempotent.
 */
export async function syncLeads(): Promise<{ fetched: number }> {
  const since = await getSyncCursor();
  const leads = await fetchLeadsSince(since);

  for (const lead of leads) {
    await db
      .insert(leadIndex)
      .values({
        sourceId: lead.sourceId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        domain: lead.domain,
        slug: lead.slug,
        state: lead.state,
        leadCreatedAt: new Date(lead.createdAt),
      })
      .onConflictDoUpdate({
        target: leadIndex.sourceId,
        set: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          domain: lead.domain,
          slug: lead.slug,
          state: lead.state,
          syncedAt: new Date(),
        },
      });
  }

  return { fetched: leads.length };
}
