"use server";

import { auth, signOut } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function signOutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await logAudit(Number(session.user.id), "logout", "session", Number(session.user.id), session.user.email ?? "Current user", {
      app: "tools",
      method: "manual",
    }).catch(() => undefined);
  }

  await signOut({ redirectTo: "/login" });
}
