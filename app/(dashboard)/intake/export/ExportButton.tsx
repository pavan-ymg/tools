"use client";

import { useState } from "react";
import { getExportPage, type ExportRow } from "../actions";

function toCsv(rows: ExportRow[]): string {
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

export default function ExportButton({ formType, fileSlug }: { formType: string; fileSlug: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleExport() {
    setWorking(true);
    setStatus("Fetching…");
    try {
      const allRows: ExportRow[] = [];
      let offset = 0;
      let hasMore = true;

      // Pulled in bounded pages rather than one call — no single
      // function here ever has to build the whole export at once
      // (Vercel Hobby's ~10s ceiling), so this scales regardless of
      // how many records exist.
      while (hasMore) {
        const { rows, hasMore: more } = await getExportPage(offset, formType);
        allRows.push(...rows);
        hasMore = more;
        offset += rows.length;
        setStatus(`Fetched ${allRows.length} record(s)…`);
      }

      const csv = toCsv(allRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // en-CA gives YYYY-MM-DD directly — the one Intl locale that
      // formats dates in that order without extra parsing.
      const dateSuffix = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      a.download = `intake-${fileSlug}-${dateSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(`Done — ${allRows.length} record(s) exported.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={handleExport}
        disabled={working}
        style={{
          padding: "10px 20px",
          borderRadius: 6,
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-text)",
          fontWeight: 500,
          cursor: working ? "default" : "pointer",
          opacity: working ? 0.7 : 1,
        }}
      >
        {working ? "Exporting…" : "Export (CSV)"}
      </button>
      {status && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{status}</p>}
    </div>
  );
}
