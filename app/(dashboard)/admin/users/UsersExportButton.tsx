"use client";

import { useState } from "react";
import { getUserExportRows, type UserExportRow } from "./actions";

function toCsv(rows: UserExportRow[]): string {
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

export default function UsersExportButton() {
  const [working, setWorking] = useState(false);

  async function handleExport() {
    setWorking(true);
    try {
      const rows = await getUserExportRows();
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setWorking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={working}
      style={{
        background: "transparent",
        border: "1px solid var(--glass-border)",
        color: "var(--accent)",
        borderRadius: 6,
        padding: "8px 16px",
        fontSize: 13,
        cursor: working ? "default" : "pointer",
        opacity: working ? 0.7 : 1,
      }}
    >
      {working ? "Exporting…" : "Export (CSV)"}
    </button>
  );
}
