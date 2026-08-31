import { sql, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";

/**
 * The standout feature from Pavan's original brief (§6.3): auto-match a
 * call-intake record against real LP submissions by phone/email, so
 * "did the prospect actually fill out the real form?" is an unfakeable
 * signal instead of the agent's word for it.
 *
 * Deliberately NOT stored on the intake record and re-checked live on
 * every view — a lead can arrive well AFTER the call happened (that's
 * the whole point of the feature), so a match computed once at creation
 * time would miss exactly the case this exists for.
 *
 * Phone comparison strips non-digits on both sides in SQL: lead_index
 * stores whatever raw format the LP form happened to submit (dashes,
 * parens, spaces all vary), so a plain string-equality match would miss
 * most real matches.
 *
 * Uses the query builder (not raw db.execute) specifically so the
 * result comes back through Drizzle's normal column mapping — a raw
 * SQL result returns actual Postgres column names (lead_created_at),
 * not the camelCase TS property (leadCreatedAt) the rest of the code
 * expects. Caught this in testing: it silently returned `undefined`
 * for every field read off a raw-SQL row.
 */
export async function findMatchingLead(phone: string, email: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone && !email) return null;

  const conditions = [];
  if (normalizedPhone) {
    conditions.push(sql`regexp_replace(${leadIndex.phone}, '\D', '', 'g') = ${normalizedPhone}`);
  }
  if (email) {
    conditions.push(sql`lower(${leadIndex.email}) = lower(${email})`);
  }
  if (conditions.length === 0) return null;

  const [match] = await db.select().from(leadIndex).where(or(...conditions)).limit(1);
  return match ?? null;
}
