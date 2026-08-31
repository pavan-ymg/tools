"use client";

import { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Reusable "action succeeded" confirmation — a centered modal instead
// of an inline banner, since an inline message above a long form is
// easy to miss. Driven by a query param (matching the existing
// ?passwordChanged=1-style redirects already used elsewhere) so it
// survives the server action's redirect and works with zero client
// state on the page itself.
//
// useSearchParams() needs a Suspense boundary above it during static
// generation — wrapped here so every call site gets that for free
// (same reason /login wraps its own useSearchParams() usage).
export default function SuccessModal(props: { param: string; message: string }) {
  return (
    <Suspense fallback={null}>
      <SuccessModalInner {...props} />
    </Suspense>
  );
}

function SuccessModalInner({ param, message }: { param: string; message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const show = searchParams.get(param) === "1";

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(close, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 10,
          padding: "24px 28px",
          minWidth: 280,
          textAlign: "center",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <p style={{ color: "var(--success)", fontSize: 14, fontWeight: 500, marginBottom: 16 }}>{message}</p>
        <button
          type="button"
          onClick={close}
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
