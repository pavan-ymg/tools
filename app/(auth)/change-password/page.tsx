"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";
import PasswordField from "@/components/PasswordField";

export default function ChangePasswordPage() {
  const [error, formAction, pending] = useActionState(changePasswordAction, undefined);

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
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Set a new password</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Your account was created with a temporary password. Choose your own
          before continuing.
        </p>

        <PasswordField name="newPassword" label="New password" minLength={12} />
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
          {pending ? "Saving…" : "Set password and sign in again"}
        </button>
      </form>
    </main>
  );
}
