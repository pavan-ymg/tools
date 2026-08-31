"use client";

import { useState, useTransition } from "react";
import { revealLeadAction } from "./actions";

// phone/email arrive ALREADY masked (page.tsx masks server-side before
// these props are ever created) — the real values reach the client only
// through the reveal action's own response, never through this table's
// props. Re-masking here would be too late: by then the real value
// would already be sitting in the page's data, just visually hidden.
type Row = {
  id: number;
  name: string;
  phone: string;
  email: string;
  domain: string;
  slug: string;
  state: string;
  leadCreatedAt: string;
};

const cellStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--glass-border)",
  fontSize: 13,
  whiteSpace: "nowrap",
};

export default function LeadsTable({ rows }: { rows: Row[] }) {
  const [revealed, setRevealed] = useState<Record<number, { phone: string; email: string }>>({});
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);

  function reveal(id: number) {
    setPendingId(id);
    startTransition(async () => {
      const result = await revealLeadAction(id);
      if ("phone" in result) {
        setRevealed((prev) => ({ ...prev, [id]: result }));
      }
      setPendingId(null);
    });
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {["Name", "Phone", "Email", "State", "LP Slug", "Time", "Website", ""].map((h) => (
              <th
                key={h}
                style={{
                  ...cellStyle,
                  textAlign: "left",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isRevealed = revealed[row.id];
            return (
              <tr key={row.id}>
                <td style={cellStyle}>{row.name}</td>
                <td style={cellStyle}>{isRevealed ? isRevealed.phone : row.phone}</td>
                <td style={cellStyle}>{isRevealed ? isRevealed.email : row.email}</td>
                <td style={cellStyle}>{row.state}</td>
                <td style={cellStyle}>{row.slug}</td>
                <td style={cellStyle}>{new Date(row.leadCreatedAt).toLocaleString()}</td>
                <td style={cellStyle}>{row.domain}</td>
                <td style={cellStyle}>
                  {!isRevealed && (
                    <button
                      onClick={() => reveal(row.id)}
                      disabled={pending && pendingId === row.id}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--glass-border)",
                        color: "var(--accent)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {pending && pendingId === row.id ? "…" : "Reveal"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>
          No leads yet.
        </p>
      )}
    </div>
  );
}
