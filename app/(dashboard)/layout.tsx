import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

/**
 * Gate for every dashboard route. proxy.ts only checks "is there a
 * session at all" (cheap, runs on the edge, no DB). This layout does
 * the state-sensitive checks that must be correct on THIS request, not
 * whatever was true when the token was issued up to 8h ago:
 *
 *  - account deactivated since login -> signed out
 *  - password changed since this token was issued (sessionVersion
 *    mismatch) -> signed out, forcing a fresh login (§3.6.2)
 *  - must change password (bootstrap / admin force-reset) -> redirected
 *    to /change-password, which lives outside this layout so it isn't
 *    itself gated by the same check
 *
 * Deliberately NOT baked into the JWT (§3.6.3): permission-adjacent
 * account state has to take effect immediately, not survive until the
 * token expires.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [current] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  if (!current || !current.isActive || current.sessionVersion !== session.user.sessionVersion) {
    await signOut({ redirectTo: "/login" });
    return null;
  }

  if (current.mustChangePassword) {
    redirect("/change-password");
  }

  return <>{children}</>;
}
