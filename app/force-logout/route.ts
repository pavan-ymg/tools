import { auth, signOut } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// signOut() mutates the session cookie, which Next.js only allows from a
// Server Action or Route Handler — never from a Server Component render
// (throws "Cookies can only be modified in a Server Action or Route
// Handler"). The dashboard layout can detect a dead session (deactivated
// user, sessionVersion bump) mid-render but can't clear it itself, so it
// redirects here instead, where the same signOut() call is legal.
export async function GET() {
  const session = await auth();
  if (session?.user?.id) {
    await logAudit(Number(session.user.id), "logout", "session", Number(session.user.id), session.user.email ?? "Current user", {
      app: "tools",
      method: "forced",
      reason: "inactive account or stale session version",
    }).catch(() => undefined);
  }

  await signOut({ redirectTo: "/login" });
}
