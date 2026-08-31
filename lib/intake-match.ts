import { sql } from "drizzle-orm";
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
 */
export async function findMatchingLead(phone: string, email: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone && !email) return null;

  const result = await db.execute(sql`
    SELECT * FROM lead_index
    WHERE (${normalizedPhone} != '' AND regexp_replace(phone, '\\D', '', 'g') = ${normalizedPhone})
       OR (${email} != '' AND lower(email) = lower(${email}))
    LIMIT 1
  `);

  return (result.rows[0] as typeof leadIndex.$inferSelect | undefined) ?? null;
}
