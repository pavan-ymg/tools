// Shell renders instantly; this fills the table area while the real
// data-fetching Server Component (wrapped in <Suspense>) is still
// running its DB queries — same shape as the real table so there's no
// layout jump when it swaps in.
export default function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} style={{ padding: "10px 14px", borderBottom: "1px solid var(--glass-border)" }}>
                  <span
                    className="skeleton-block"
                    style={{ height: 13, width: c === 0 ? "60%" : "80%" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
