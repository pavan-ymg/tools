// Phone/email are shown masked everywhere they're displayed read-only
// (Pavan, 2026-10-15): first few characters visible, rest stars. Masked
// on the server before render, so the full value never reaches the
// browser. Search still matches against the full value server-side.
const VISIBLE_CHARS = 3;

export function maskValue(value: string | null | undefined): string {
  if (!value) return "";
  const visible = value.slice(0, VISIBLE_CHARS);
  return visible + "*".repeat(Math.max(0, value.length - VISIBLE_CHARS));
}
