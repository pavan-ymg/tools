import { signOut } from "@/lib/auth";

// signOut() mutates the session cookie, which Next.js only allows from a
// Server Action or Route Handler — never from a Server Component render
// (throws "Cookies can only be modified in a Server Action or Route
// Handler"). The dashboard layout can detect a dead session (deactivated
// user, sessionVersion bump) mid-render but can't clear it itself, so it
// redirects here instead, where the same signOut() call is legal.
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
