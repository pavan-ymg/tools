"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshLeadsAction } from "./actions";

// Sync-on-demand (§3.2) now runs only here, not on every page render —
// pagination/search/page-size navigation used to re-run the core-api
// sync + batch upsert on every single request. This button is the only
// thing that pulls fresh leads; everything else just reads lead_index.
export default function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      const result = await refreshLeadsAction();
      setError(result.error);
      router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "1px solid var(--glass-border)",
          color: "var(--accent)",
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 13,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: pending ? "spin 0.7s linear infinite" : "none" }}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
        {pending ? "Refreshing…" : "Refresh"}
      </button>
      {error && (
        <span style={{ color: "var(--danger)", fontSize: 12 }}>
          Couldn&apos;t sync new leads ({error}) — showing last synced data.
        </span>
      )}
    </div>
  );
}
