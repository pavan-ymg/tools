import { formatDateTime } from "@/lib/format-date";

type Row = {
  id: number;
  name: string;
  phone: string;
  email: string;
  domain: string;
  slug: string;
  state: string;
  leadCreatedAt: string;
};

const cellStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--glass-border)",
  fontSize: 13,
  whiteSpace: "nowrap",
};

export default function LeadsTable({ rows }: { rows: Row[] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {["Name", "Phone", "Email", "State", "LP Slug", "Time (IST)", "Website"].map((h) => (
              <th
                key={h}
                style={{
                  ...cellStyle,
                  textAlign: "left",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={cellStyle}>{row.name}</td>
              <td style={cellStyle}>{row.phone}</td>
              <td style={cellStyle}>{row.email}</td>
              <td style={cellStyle}>{row.state}</td>
              <td style={cellStyle}>{row.slug}</td>
              <td style={cellStyle}>{formatDateTime(new Date(row.leadCreatedAt))}</td>
              <td style={cellStyle}>{row.domain}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>
          No leads yet.
        </p>
      )}
    </div>
  );
}
