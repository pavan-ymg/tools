"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage() {
  const [message, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Reset password</h1>

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

        {message && <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{message}</p>}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 0",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-text)",
            fontWeight: 500,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>

        <a href="/login" style={{ fontSize: 13, color: "var(--accent)", textAlign: "center" }}>
          Back to sign in
        </a>
      </form>
    </main>
  );
}
