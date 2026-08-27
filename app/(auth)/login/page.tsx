"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

// useSearchParams() needs a Suspense boundary above it during static
// generation — the default export just provides that; LoginForm has
// all the actual page content.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, undefined);
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "1";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        action={formAction}
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          borderRadius: 12,
          padding: 32,
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>YMG Ops</h1>

        {passwordChanged && (
          <p style={{ color: "var(--success)", fontSize: 13 }}>
            Password updated. Please sign in.
          </p>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Email</span>
          <input
            name="email"
            type="email"
            required
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.2)",
              color: "var(--text-primary)",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Password</span>
          <input
            name="password"
            type="password"
            required
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.2)",
              color: "var(--text-primary)",
            }}
          />
        </label>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 0",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "white",
            fontWeight: 500,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
