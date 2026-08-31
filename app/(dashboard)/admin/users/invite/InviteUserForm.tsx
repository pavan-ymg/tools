"use client";

import { useActionState } from "react";
import { inviteUserAction, type InviteResult } from "../actions";

type Role = { id: number; name: string };
type ManagerCandidate = { id: number; name: string };

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--glass-border)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

export default function InviteUserForm({ roles, managers }: { roles: Role[]; managers: ManagerCandidate[] }) {
  const [result, formAction, pending] = useActionState<InviteResult | undefined, FormData>(
    inviteUserAction,
    undefined
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Name</span>
        <input name="name" type="text" required style={inputStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Email</span>
        <input name="email" type="email" required style={inputStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Reports to</span>
        <select name="managerId" style={inputStyle} defaultValue="">
          <option value="">(no manager)</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Roles</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {roles.map((r) => (
            <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="roleIds" value={r.id} style={{ width: 16, height: 16 }} />
              {r.name}
            </label>
          ))}
        </div>
      </div>

      {result?.error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{result.error}</p>}

      {result?.inviteUrl && (
        <div
          style={{
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
          }}
        >
          <p style={{ color: result.emailSent ? "var(--success)" : "var(--text-secondary)", marginBottom: 8 }}>
            {result.emailSent
              ? "Invite created and emailed."
              : "Invite created, but the email couldn't be sent — share this link directly:"}
          </p>
          <input readOnly value={result.inviteUrl} style={inputStyle} onClick={(e) => e.currentTarget.select()} />
        </div>
      )}

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
        {pending ? "Sending invite…" : "Send invite"}
      </button>
    </form>
  );
}
