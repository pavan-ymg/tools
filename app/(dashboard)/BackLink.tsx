import Link from "next/link";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-primary)",
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 999,
        padding: "7px 16px",
        textDecoration: "none",
        marginBottom: 20,
      }}
    >
      ← {label}
    </Link>
  );
}
