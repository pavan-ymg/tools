"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "./actions";
import PasswordField from "@/components/PasswordField";

export default function InviteForm({ token, name }: { token: string; name: string }) {
  const boundAction = acceptInviteAction.bind(null, token);
  const [error, formAction, pending] = useActionState(boundAction, undefined);

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
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Welcome{name ? `, ${name}` : ""}</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Set your password to finish setting up your account.</p>

        <PasswordField name="password" label="Password" minLength={12} />
        <PasswordField name="confirmPassword" label="Confirm password" minLength={12} />

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

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
          {pending ? "Saving…" : "Set password and sign in"}
        </button>
      </form>
    </main>
  );
}
