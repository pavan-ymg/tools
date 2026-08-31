"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActiveAction, deleteUserAction } from "./actions";
import ConfirmDialog from "@/app/(dashboard)/ConfirmDialog";

export default function UserRowActions({ userId, name, isActive }: { userId: number; name: string; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"deactivate" | "delete" | null>(null);
  const router = useRouter();

  function toggleActive() {
    if (isActive) {
      setConfirming("deactivate");
      return;
    }
    runToggle();
  }

  function runToggle() {
    setConfirming(null);
    setError(null);
    startTransition(async () => {
      const result = await toggleUserActiveAction(userId, !isActive);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    setConfirming("delete");
  }

  function runDelete() {
    setConfirming(null);
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={toggleActive}
          className="chip"
          style={{
            background: "transparent",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            cursor: pending ? "default" : "pointer",
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 5,
          }}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="chip"
          style={{
            background: "transparent",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            cursor: pending ? "default" : "pointer",
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 5,
          }}
        >
          Delete
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}

      <ConfirmDialog
        open={confirming === "deactivate"}
        message={`Deactivate ${name}? They'll lose access immediately.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={runToggle}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "delete"}
        message={`Permanently delete ${name}? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={runDelete}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
