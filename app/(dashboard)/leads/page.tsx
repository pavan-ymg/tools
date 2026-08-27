import { auth, signOut } from "@/lib/auth";

export default async function LeadsPage() {
  const session = await auth();

  return (
    <main style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Lead Feed</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      <p style={{ color: "var(--text-secondary)" }}>
        Signed in as {session?.user?.email} — roles: {session?.user?.roles?.join(", ") || "none"}
      </p>

      <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>
        Placeholder — the actual lead feed (Phase 1) reads from core-api&apos;s
        read-only lead index endpoint. See docs/tools/PLAN.md.
      </p>
    </main>
  );
}
