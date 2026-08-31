"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoleAction } from "./actions";

export default function DeleteRoleButton({ roleId }: { roleId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteRoleAction(roleId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 13, padding: 0 }}
      >
        Delete
      </button>
      {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
