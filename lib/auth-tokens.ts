import crypto from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens } from "@/db/schema";

// Backs invite links, password resets, and any future magic-link flow —
// one table, one shape (§3.6.2). The raw token is only ever known to
// the recipient; the database stores a hash, so a DB leak doesn't hand
// over working reset links.

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(
  userId: number,
  type: "invite" | "reset",
  ttlMs: number
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(authTokens).values({ userId, tokenHash: hashToken(token), type, expiresAt });
  return token;
}

/** Returns the token row if valid (right type, not expired, not used), else null. */
export async function consumeAuthToken(token: string, type: "invite" | "reset") {
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  return row ?? null;
}

export async function markTokenUsed(tokenId: number) {
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, tokenId));
}
