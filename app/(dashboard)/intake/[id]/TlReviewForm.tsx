"use client";

import { useActionState } from "react";

type ReviewAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export default function TlReviewForm({
  scoredByTl,
  tlComment,
  action,
}: {
  scoredByTl: boolean;
  tlComment: string | null;
  action: ReviewAction;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: "1px solid var(--glass-border)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>TL Review</span>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input type="checkbox" name="scored" defaultChecked={scoredByTl} style={{ width: 18, height: 18 }} />
        Mark as scored
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Comment</span>
        <textarea
          name="comment"
          rows={2}
          defaultValue={tlComment ?? ""}
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)" }}
        />
      </label>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ padding: "8px 0", borderRadius: 6, border: "none", background: "var(--accent)", color: "var(--accent-text)", fontWeight: 500, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
