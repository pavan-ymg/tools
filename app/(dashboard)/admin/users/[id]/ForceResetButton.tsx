"use client";

import { useState, useTransition } from "react";
import { forceResetAction } from "../actions";

export default function ForceResetButton({ userId }: { userId: number }) {
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { resetUrl } = await forceResetAction(userId);
            setResetUrl(resetUrl);
          })
        }
        style={{
          background: "transparent",
          border: "1px solid var(--danger)",
          color: "var(--danger)",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 13,
          cursor: pending ? "default" : "pointer",
          width: "fit-content",
        }}
      >
        {pending ? "Working…" : "Force password reset (signs out all sessions)"}
      </button>

      {resetUrl && (
        <input
          readOnly
          value={resetUrl}
          onClick={(e) => e.currentTarget.select()}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "var(--text-primary)",
            fontSize: 12,
          }}
        />
      )}
    </div>
  );
}
