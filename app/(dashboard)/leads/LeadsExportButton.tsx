"use client";

import { useState } from "react";
import { getLeadExportPage, type LeadExportRow } from "./actions";

function toCsv(rows: LeadExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

export default function LeadsExportButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleExport() {
    setWorking(true);
    setStatus("Fetching…");
    try {
      const allRows: LeadExportRow[] = [];
      let afterId = 0;
      let hasMore = true;

      while (hasMore) {
        const { rows, lastId, hasMore: more } = await getLeadExportPage(afterId);
        allRows.push(...rows);
        hasMore = more;
        afterId = lastId;
        setStatus(`Fetched ${allRows.length} lead(s)…`);
      }

      const csv = toCsv(allRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(`Done — ${allRows.length} lead(s) exported.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        onClick={handleExport}
        disabled={working}
        style={{
          background: "transparent",
          border: "1px solid var(--glass-border)",
          color: "var(--accent)",
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 13,
          cursor: working ? "default" : "pointer",
          opacity: working ? 0.7 : 1,
        }}
      >
        {working ? "Exporting…" : "Export (CSV)"}
      </button>
      {status && <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{status}</p>}
    </div>
  );
}
