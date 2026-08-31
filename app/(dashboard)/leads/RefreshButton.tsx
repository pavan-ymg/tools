"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Leads land in lead_index via sync-on-demand (§3.2, lib/lead-sync.ts) —
// re-running that only happens when this page itself re-renders. A
// manual refresh re-runs the whole server request (sync + query) instead
// of waiting for the next natural navigation.
export default function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      style={{
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
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
