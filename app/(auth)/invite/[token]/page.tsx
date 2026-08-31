import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { consumeAuthToken } from "@/lib/auth-tokens";
import InviteForm from "./InviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Read-only validity check here (doesn't consume the token — only
  // the actual submit does) so an expired/used link fails fast instead
  // of after someone fills out the whole form.
  const tokenRow = await consumeAuthToken(token, "invite");

  if (!tokenRow) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--danger)" }}>This invite link is invalid or has expired.</p>
      </main>
    );
  }

  const [user] = await db.select().from(users).where(eq(users.id, tokenRow.userId)).limit(1);

  return <InviteForm token={token} name={user?.name ?? ""} />;
}
