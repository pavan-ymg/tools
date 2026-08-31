"use client";

import { useActionState } from "react";
import { createRoleAction } from "../actions";

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--glass-border)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

export default function NewRoleForm({ cloneableRoles }: { cloneableRoles: Array<{ id: number; name: string }> }) {
  const [error, formAction, pending] = useActionState<string | undefined, FormData>(createRoleAction, undefined);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Name</span>
        <input name="name" type="text" required style={inputStyle} placeholder="Quality Assurance" />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Slug</span>
        <input name="slug" type="text" required style={inputStyle} placeholder="quality_assurance" />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Lowercase, no spaces — used internally, never shown to agents.</span>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Start from</span>
        <select name="cloneFromRoleId" style={inputStyle} defaultValue="">
          <option value="">(blank — no permissions granted yet)</option>
          {cloneableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              Copy {r.name}&apos;s permissions
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Only a starting point — you can adjust every permission afterward.
        </span>
      </label>

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
        {pending ? "Creating…" : "Create role"}
      </button>
    </form>
  );
}
