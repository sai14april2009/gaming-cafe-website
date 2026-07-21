// Format a Date as YYYY-MM-DD in the LOCAL timezone (not UTC).
// Using `.toISOString().split("T")[0]` shifts across midnight in IST etc.,
// causing bookings created between 00:00–05:29 IST to be stored/queried
// under the previous UTC day. This helper avoids that.
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
