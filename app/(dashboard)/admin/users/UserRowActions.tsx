"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActiveAction, deleteUserAction } from "./actions";

export default function UserRowActions({ userId, isActive }: { userId: number; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      await toggleUserActiveAction(userId, !isActive);
      router.refresh();
    });
  }

  function handleDelete() {
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
