// Every timestamp in this app is rendered server-side (Server
// Components), where `.toLocaleString()`/`.toLocaleDateString()` with
// no arguments uses the SERVER's timezone — UTC on Vercel — not the
// viewer's. The whole team is IST, so every displayed time was showing
// 5:30 early with no indication anything was off (Pavan, 2026-09-01:
// caught a lead timestamped 3:01 PM that actually arrived at 8:31 PM
// IST). Force Asia/Kolkata explicitly everywhere a date is shown,
// rather than leaving it to whatever timezone happens to run the
// process.
const TIME_ZONE = "Asia/Kolkata";

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", { timeZone: TIME_ZONE });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: TIME_ZONE });
}

// IST has no daylight saving, so a fixed +05:30 offset is always
// correct — no need for a timezone library just for this one field.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// For pre-filling a <input type="datetime-local">: its value format
// is bare "YYYY-MM-DDTHH:mm" with no timezone, which the browser always
// treats as the VIEWER's local wall-clock time. Computing that string
// via `.toISOString()` server-side would express the date in UTC
// instead, showing a follow-up time up to 5.5h off from what was
// actually saved (Pavan, 2026-09-01, on a related bug in the Lead Feed
// timestamp). Shifting by the IST offset before slicing produces the
// same bare-string trick, just anchored to IST instead of UTC.
export function toISTDateTimeLocalValue(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

// The reverse: a bare "YYYY-MM-DDTHH:mm" submitted from that same
// input is the user's intended IST wall-clock time — appending the
// explicit IST offset (rather than calling `new Date(value)` directly,
// which would parse it as the SERVER's local time, i.e. UTC on Vercel)
// is what makes the round trip correct regardless of server timezone.
export function fromISTDateTimeLocalValue(value: string): Date {
  return new Date(`${value}:00+05:30`);
}
