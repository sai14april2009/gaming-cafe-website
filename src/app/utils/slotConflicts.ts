import { supabase } from "../../supabase";

export type SlotConflictSource = "walk-in" | "booking" | "repair";

export interface SlotConflict {
  hour: number;
  source: SlotConflictSource;
}

/**
 * Re-verify a set of hour slots against ALL THREE conflict sources — non-ended
 * walk-in sessions, confirmed bookings, and repair slots — for a system + date,
 * immediately before an insert. Returns every clashing hour paired with the source
 * that claims it (empty array = clear).
 *
 * Shared by the Gaming Systems grid (reserve / block-for-repair) and the Repair
 * Slots form so both enforce the same rule instead of drifting.
 */
export async function findSlotConflicts(
  systemId: string,
  date: string,
  slots: number[]
): Promise<SlotConflict[]> {
  const [{ data: liveWalkIns }, { data: liveBookings }, { data: liveRepairs }] = await Promise.all([
    supabase.from("walk_in_sessions").select("slots, status").eq("system_id", systemId).eq("session_date", date).in("status", ["scheduled", "active"]),
    supabase.from("bookings").select("start_time, end_time").eq("system_id", systemId).eq("booking_date", date).eq("status", "confirmed"),
    supabase.from("repair_slots").select("start_hour, end_hour").eq("system_id", systemId).eq("repair_date", date),
  ]);

  const walkInHours = new Set<number>();
  (liveWalkIns || []).forEach((w: any) => (w.slots || []).forEach((h: number) => walkInHours.add(h)));

  const bookingHours = new Set<number>();
  (liveBookings || []).forEach((b: any) => {
    const s = parseInt(b.start_time.split(":")[0], 10);
    const e = parseInt(b.end_time.split(":")[0], 10);
    for (let h = s; h < e; h++) bookingHours.add(h);
  });

  const repairHours = new Set<number>();
  (liveRepairs || []).forEach((r: any) => {
    for (let h = r.start_hour; h < r.end_hour; h++) repairHours.add(h);
  });

  const conflicts: SlotConflict[] = [];
  for (const h of [...slots].sort((a, b) => a - b)) {
    if (walkInHours.has(h)) conflicts.push({ hour: h, source: "walk-in" });
    else if (bookingHours.has(h)) conflicts.push({ hour: h, source: "booking" });
    else if (repairHours.has(h)) conflicts.push({ hour: h, source: "repair" });
  }
  return conflicts;
}
