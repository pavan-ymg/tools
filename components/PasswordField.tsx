"use client";

import { useState } from "react";

export default function PasswordField({
  name,
  label,
  minLength,
}: {
  name: string;
  label: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 44px 8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 12,
            padding: "4px 8px",
          }}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
