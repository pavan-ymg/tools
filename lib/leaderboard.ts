import { gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { intakeRecords, intakeEvents, leadIndex, users } from "@/db/schema";

// Stored as a plain object, not hardcoded into the scoring logic below,
// so Pavan can hand-tune these once there's real data without a
// redeploy touching the actual computation (§7.2). All scoring reads
// from the immutable event log — never from an editable counter — so a
// record's score can't be inflated by editing it after the fact.
export const SCORE_WEIGHTS = {
  tlConfirmed: 10, // TL marked "scored" — the headline number, TL-validated so it can't be self-inflated
  lpFormCompleted: 3, // the LP-match badge — unfakeable proof the prospect followed through
  contactMade: 2, // reached the prospect (stage >= contacted)
  speedBonus: 2, // first attempt logged within 5 min of the matched lead's arrival
  attemptLogged: 0.5, // deliberately small — effort counts, but volume alone can't climb the board
};

const CONTACTED_OR_BEYOND = ["contacted", "qualified", "sent_to_lp", "confirmed", "rejected", "dead"];
const SPEED_BONUS_WINDOW_MS = 5 * 60 * 1000;

export type TimeWindow = "today" | "week" | "month" | "all";

function windowStart(window: TimeWindow): Date {
  const now = new Date();
  if (window === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (window === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (window === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(0);
}

export type LeaderboardRow = {
  ownerId: number;
  ownerName: string;
  points: number;
  recordsWorked: number;
  contacted: number;
  contactRate: number;
  scoredByTl: number;
};

type LeadMatch = {
  leadCreatedAt: Date;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function findMatchingLeads(records: Array<{ phone: string; email: string }>): Promise<Map<string, LeadMatch>> {
  const phones = [...new Set(records.map((r) => normalizePhone(r.phone)).filter(Boolean))];
  const emails = [...new Set(records.map((r) => r.email.trim().toLowerCase()).filter(Boolean))];
  if (phones.length === 0 && emails.length === 0) return new Map();

  const conditions = [];
  if (phones.length > 0) conditions.push(inArray(sql`regexp_replace(${leadIndex.phone}, '\D', '', 'g')`, phones));
  if (emails.length > 0) conditions.push(inArray(sql`lower(${leadIndex.email})`, emails));

  const rows = await db
    .select({
      phone: leadIndex.phone,
      email: leadIndex.email,
      leadCreatedAt: leadIndex.leadCreatedAt,
    })
    .from(leadIndex)
    .where(or(...conditions));

  const matches = new Map<string, LeadMatch>();
  for (const row of rows) {
    const phoneKey = normalizePhone(row.phone);
    const emailKey = row.email.trim().toLowerCase();
    const match = { leadCreatedAt: row.leadCreatedAt };
    if (phoneKey && !matches.has(`phone:${phoneKey}`)) matches.set(`phone:${phoneKey}`, match);
    if (emailKey && !matches.has(`email:${emailKey}`)) matches.set(`email:${emailKey}`, match);
  }

  return matches;
}

/**
 * Computed in application code rather than one giant SQL aggregate —
 * internal-tool data volume makes this simple and easy to adjust, and
 * keeps the LP-match check (§6.3, always live, never stored) using the
 * exact same lookup the intake detail page uses, instead of a second
 * implementation that could drift out of sync.
 *
 * Deliberately always computes across EVERY owner, regardless of the
 * viewer's scope — unlike intake records, "own" scope on a leaderboard
 * doesn't mean "only see your own data" (that would make it pointless
 * as a leaderboard). The caller decides what to DISPLAY: top N + own
 * rank for 'own', team-filtered for 'team', everyone for 'all' (§7.3).
 */
export async function getLeaderboard(window: TimeWindow): Promise<LeaderboardRow[]> {
  const since = windowStart(window);
  const records = await db.select().from(intakeRecords).where(gte(intakeRecords.createdAt, since));
  if (records.length === 0) return [];

  const recordIds = records.map((r) => r.id);
  const [events, leadMatches] = await Promise.all([
    db.select().from(intakeEvents).where(inArray(intakeEvents.intakeRecordId, recordIds)),
    findMatchingLeads(records),
  ]);
  const eventsByRecord = new Map<number, typeof events>();
  for (const e of events) {
    const list = eventsByRecord.get(e.intakeRecordId) ?? [];
    list.push(e);
    eventsByRecord.set(e.intakeRecordId, list);
  }

  const scoreByOwner = new Map<number, { points: number; worked: number; contacted: number; scored: number }>();

  for (const record of records) {
    const acc = scoreByOwner.get(record.ownerId) ?? { points: 0, worked: 0, contacted: 0, scored: 0 };
    acc.worked += 1;

    let points = 0;
    const recordEvents = (eventsByRecord.get(record.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    if (CONTACTED_OR_BEYOND.includes(record.stage)) {
      points += SCORE_WEIGHTS.contactMade;
      acc.contacted += 1;
    }

    const lastReview = [...recordEvents].reverse().find((e) => e.eventType === "tl_reviewed");
    if (lastReview && (lastReview.detail as { scored?: boolean })?.scored) {
      points += SCORE_WEIGHTS.tlConfirmed;
      acc.scored += 1;
    }

    // One lookup, reused for both the LP-completed bonus and the speed
    // bonus below — these are two different signals from the same
    // match, not two separate checks.
    const phoneKey = normalizePhone(record.phone);
    const emailKey = record.email.trim().toLowerCase();
    const lpMatch = (phoneKey ? leadMatches.get(`phone:${phoneKey}`) : null) ?? (emailKey ? leadMatches.get(`email:${emailKey}`) : null);
    if (lpMatch) points += SCORE_WEIGHTS.lpFormCompleted;

    const firstAttempt = recordEvents.find(
      (e) => e.eventType === "stage_changed" && (e.detail as { to?: string })?.to === "attempted"
    );
    if (firstAttempt) {
      points += SCORE_WEIGHTS.attemptLogged;

      if (lpMatch) {
        const gapMs = firstAttempt.createdAt.getTime() - lpMatch.leadCreatedAt.getTime();
        if (gapMs >= 0 && gapMs <= SPEED_BONUS_WINDOW_MS) {
          points += SCORE_WEIGHTS.speedBonus;
        }
      }
    }

    acc.points += points;
    scoreByOwner.set(record.ownerId, acc);
  }

  const ownerIds = [...scoreByOwner.keys()];
  const owners = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ownerIds));
  const nameById = new Map(owners.map((o) => [o.id, o.name]));

  const rows: LeaderboardRow[] = ownerIds.map((ownerId) => {
    const acc = scoreByOwner.get(ownerId)!;
    return {
      ownerId,
      ownerName: nameById.get(ownerId) ?? "Unknown",
      points: Math.round(acc.points * 10) / 10,
      recordsWorked: acc.worked,
      contacted: acc.contacted,
      contactRate: acc.worked > 0 ? Math.round((acc.contacted / acc.worked) * 100) : 0,
      scoredByTl: acc.scored,
    };
  });

  rows.sort((a, b) => b.points - a.points);
  return rows;
}
