"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActiveAction, deleteUserAction } from "./actions";

export default function UserRowActions({ userId, name, isActive }: { userId: number; name: string; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    if (isActive && !window.confirm(`Deactivate ${name}? They'll lose access immediately.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleUserActiveAction(userId, !isActive);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Permanently delete ${name}? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          disabled={pending}
          onClick={toggleActive}
          style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          Delete
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}
    </div>
  );
}
