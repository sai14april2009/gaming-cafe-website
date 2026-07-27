import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Trash2, Plus } from "lucide-react";
import { toLocalDateString } from "../utils/date";

interface SystemsManagerProps {
  cafeId: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
}

interface GamingSystemRow {
  id: string;
  name: string;
  type: "PC" | "Console";
  gpu: string;
  cpu: string;
  ram: string;
  console: string;
}

interface WalkInSession {
  id: string;
  system_id: string;
  status: "scheduled" | "active" | "ended";
  slots: number[];
  session_date: string;
  start_time: number;
  end_time: number;
  started_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
}

interface RepairSlot {
  id: string;
  system_id: string;
  repair_date: string;
  start_hour: number;
  end_hour: number;
}

interface OnlineBooking {
  id: string;
  system_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  num_people: number;
  total_price: number | null;
  status: string | null;
  cancellation_reason: string | null;
  players: { name: string; phone: string }[] | null;
}

interface ConflictInfo {
  systemId: string;
  selectedSlots: number[];
  conflictingBooking: OnlineBooking;
}

function toToday(): string {
  return toLocalDateString(new Date());
}

function formatDateShort(date: Date) {
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    dateNum: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

export function SystemsManager({ cafeId, pricePerHour, openingTime, closingTime }: SystemsManagerProps) {
  const [systems, setSystems] = useState<GamingSystemRow[]>([]);
  const [walkInSessions, setWalkInSessions] = useState<WalkInSession[]>([]);
  const [repairSlots, setRepairSlots] = useState<RepairSlot[]>([]);
  const [onlineBookings, setOnlineBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  // Which of the next 7 days (today..+6) the grid is showing. The grid data below
  // now spans the whole window; this just selects which day's statuses to render.
  const [selectedDate, setSelectedDate] = useState<string>(toToday());

  // Cancel/refund modal — opened by clicking a Booked (red) slot. Replicates the
  // old Advanced Booking tab's cancel flow (kept identical; BookingsList untouched).
  const [cancelBooking, setCancelBooking] = useState<OnlineBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Stage 2 — action panel for a "later" free-slot selection (future hours today or
  // any hour on a future day). null = showing the Reserve / Block-for-repair choice.
  const [panelAction, setPanelAction] = useState<"reserve" | "repair" | null>(null);
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resNote, setResNote] = useState("");
  const [repairReason, setRepairReason] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState("");

  // Stage 2 — reservation detail popover, opened by clicking a Reserved (yellow) slot.
  const [reservationDetail, setReservationDetail] = useState<WalkInSession | null>(null);
  const [cancellingReservation, setCancellingReservation] = useState(false);

  // Walk-in state per system
  const [walkInSystemId, setWalkInSystemId] = useState<string | null>(null);
  const [selectedWalkInSlots, setSelectedWalkInSlots] = useState<number[]>([]);
  const [consecutiveWarning, setConsecutiveWarning] = useState<string | null>(null);

  // Conflict modal
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [waitingForReschedule, setWaitingForReschedule] = useState(false);

  // Session end popup
  const [endedSession, setEndedSession] = useState<{
    systemName: string;
    nextBooking: OnlineBooking | null;
    amountToCollect: number | null;
  } | null>(null);

  // Add system form
  const [form, setForm] = useState({
    name: "", type: "PC" as "PC" | "Console",
    gpu: "", cpu: "", ram: "", console: "",
  });

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate slots from café opening hours
  const parseHour = (time: string) => parseInt(time?.split(":")[0] || "8", 10);
  const parseMinute = (time: string) => parseInt(time?.split(":")[1] || "0", 10) || 0;
  const openHour = parseHour(openingTime);
  const closeHour = parseHour(closingTime);
  // First slot starts at/after opening (round up if opening has minutes, e.g. 6:29 -> 7:00).
  // Last slot ends by the closing hour, so slots run firstSlot .. closeHour-1.
  const firstSlot = parseMinute(openingTime) > 0 ? openHour + 1 : openHour;
  const todaySlots = Array.from(
    { length: Math.max(0, closeHour - firstSlot) },
    (_, i) => firstSlot + i
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch the whole 7-day window (today..+6) once and filter per-day client-side —
    // mirrors BookingsList's window approach, so switching days has no loading flash.
    const todayStr = toLocalDateString(new Date());
    const last = new Date();
    last.setDate(last.getDate() + 6);
    const lastStr = toLocalDateString(last);
    const [{ data: systemsData }, { data: walkInData }, { data: repairData }, { data: bookingsData }] =
      await Promise.all([
        supabase.from("gaming_systems").select("*").eq("cafe_id", cafeId).order("created_at", { ascending: true }),
        supabase.from("walk_in_sessions").select("*").eq("cafe_id", cafeId).in("status", ["scheduled", "active"]).gte("session_date", todayStr).lte("session_date", lastStr),
        supabase.from("repair_slots").select("*").eq("cafe_id", cafeId).gte("repair_date", todayStr).lte("repair_date", lastStr),
        supabase.from("bookings").select("*").eq("cafe_id", cafeId).eq("status", "confirmed").gte("booking_date", todayStr).lte("booking_date", lastStr),
      ]);
    setSystems(systemsData || []);
    setWalkInSessions(walkInData || []);
    setRepairSlots(repairData || []);
    setOnlineBookings(bookingsData || []);
    setLoading(false);
  }, [cafeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  // All three lookups are scoped to the selected day now that the state arrays span
  // the whole 7-day window.
  const getSlotStatus = (systemId: string, hour: number) => {
    const walkIn = walkInSessions.find(
      (s) => s.system_id === systemId && s.session_date === selectedDate && s.slots.includes(hour) && s.status !== "ended"
    );
    if (walkIn) return walkIn.status === "active" ? "occupied" : "reserved";

    const repair = repairSlots.find(
      (r) => r.system_id === systemId && r.repair_date === selectedDate && r.start_hour <= hour && r.end_hour > hour
    );
    if (repair) return "repair";

    const booking = onlineBookings.find((b) => {
      if (b.system_id !== systemId || b.booking_date !== selectedDate) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return startH <= hour && endH > hour;
    });
    if (booking) return "booked";

    return "available";
  };

  // Scoped to selectedDate — which is always today when a walk-in is being started
  // (future free slots aren't clickable in Stage 1). Without the date filter, a
  // future booking on the same system+hour would falsely block a today walk-in.
  const getConflictingBooking = (systemId: string, slots: number[]) => {
    return onlineBookings.find((b) => {
      if (b.system_id !== systemId || b.booking_date !== selectedDate) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return slots.some((slot) => slot >= startH && slot < endH);
    }) || null;
  };

  const calculateWalkInPrice = (slots: number[]) => {
    if (slots.length === 0) return { breakdown: [], total: 0 };
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const breakdown: string[] = [];
    let total = 0;
    sortedSlots.forEach((slot, index) => {
      const slotEndMinutes = (slot + 1) * 60;
      let minutesPlayed: number;
      if (index === 0) {
        const actualStart = Math.max(currentMinutes, slot * 60);
        minutesPlayed = slotEndMinutes - actualStart;
      } else {
        minutesPlayed = 60;
      }
      const slotPrice = Math.round((minutesPlayed / 60) * pricePerHour * 100) / 100;
      total += slotPrice;
      breakdown.push(`${formatHour(slot)} → ${minutesPlayed} min → ₹${slotPrice.toFixed(2)}`);
    });
    return { breakdown, total: Math.round(total * 100) / 100 };
  };

  const canStartWalkIn = (systemId: string, slots: number[]): { allowed: boolean; reason: string } => {
    if (slots.length === 0) return { allowed: false, reason: "" };
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const firstSlot = sortedSlots[0];
    if (firstSlot === currentHour) {
      const minutesLeft = 60 - currentMinutes;
      const nextSlotBooked = getConflictingBooking(systemId, [firstSlot + 1]);
      if (minutesLeft < 20 && nextSlotBooked) {
        return {
          allowed: false,
          reason: `Only ${minutesLeft} min left and ${formatHour(firstSlot + 1)} is booked by ${nextSlotBooked.players?.[0]?.name || "a customer"}. Move this customer to another system.`
        };
      }
      if (minutesLeft < 20) {
        return { allowed: true, reason: `warning:Only ${minutesLeft} min left. Customer plays until ${formatHour(firstSlot + 1)}.` };
      }
    }
    return { allowed: true, reason: "" };
  };

  // Switch the day shown in the grid; drop any in-progress walk-in selection so it
  // can't leak across days.
  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setWalkInSystemId(null);
    setSelectedWalkInSlots([]);
    setConsecutiveWarning(null);
    setPanelAction(null);
    setPanelError("");
    setResName(""); setResPhone(""); setResNote(""); setRepairReason("");
  };

  // Shared clearing of an in-progress selection + its action panel.
  const clearSelection = () => {
    setWalkInSystemId(null);
    setSelectedWalkInSlots([]);
    setConsecutiveWarning(null);
    setPanelAction(null);
    setPanelError("");
    setResName(""); setResPhone(""); setResNote(""); setRepairReason("");
  };

  // Re-verify a set of slots against ALL THREE conflict sources (walk-ins, online
  // bookings, repairs) for a given system + date, immediately before an insert.
  // Returns the first clashing hour, or null if clear. This is the Stage 2 upgrade
  // of the walk-in re-check: adds repair_slots and is parameterized by date.
  const findLiveClash = async (systemId: string, date: string, slots: number[]): Promise<number | null> => {
    const [{ data: liveWalkIns }, { data: liveBookings }, { data: liveRepairs }] = await Promise.all([
      supabase.from("walk_in_sessions").select("slots, status").eq("system_id", systemId).eq("session_date", date).in("status", ["scheduled", "active"]),
      supabase.from("bookings").select("start_time, end_time").eq("system_id", systemId).eq("booking_date", date).eq("status", "confirmed"),
      supabase.from("repair_slots").select("start_hour, end_hour").eq("system_id", systemId).eq("repair_date", date),
    ]);
    const taken = new Set<number>();
    (liveWalkIns || []).forEach((w: any) => (w.slots || []).forEach((h: number) => taken.add(h)));
    (liveBookings || []).forEach((b: any) => {
      const s = parseInt(b.start_time.split(":")[0], 10);
      const e = parseInt(b.end_time.split(":")[0], 10);
      for (let h = s; h < e; h++) taken.add(h);
    });
    (liveRepairs || []).forEach((r: any) => {
      for (let h = r.start_hour; h < r.end_hour; h++) taken.add(h);
    });
    const clash = [...slots].sort((a, b) => a - b).find((h) => taken.has(h));
    return clash === undefined ? null : clash;
  };

  // Reserve → walk_in_sessions row (NEVER bookings). status 'active' if the range
  // includes the current hour today, else 'scheduled'. In practice Reserve is only
  // offered on the "later" path so it's always 'scheduled'; the isNow branch is
  // defensive and matches the spec's literal rule.
  const createReservation = async (systemId: string, slots: number[]) => {
    if (slots.length === 0) return;
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const isNow = selectedDate === toToday() && sortedSlots.includes(now.getHours());
    setPanelSaving(true);
    setPanelError("");

    const clash = await findLiveClash(systemId, selectedDate, sortedSlots);
    if (clash !== null) {
      setPanelError(`${formatHour(clash)} was just taken on this system. Pick another slot.`);
      setPanelSaving(false);
      fetchAll();
      return;
    }

    const { error } = await supabase.from("walk_in_sessions").insert({
      cafe_id: cafeId,
      system_id: systemId,
      status: isNow ? "active" : "scheduled",
      slots: sortedSlots,
      session_date: selectedDate,
      start_time: sortedSlots[0],
      end_time: sortedSlots[sortedSlots.length - 1] + 1,
      started_at: isNow ? new Date().toISOString() : null,
      customer_name: resName.trim() || null,
      customer_phone: resPhone.trim() || null,
      note: resNote.trim() || null,
    });
    setPanelSaving(false);

    if (error) {
      // 23P01 = walk_in_no_overlap exclusion violation (a concurrent overlapping insert).
      setPanelError(
        error.code === "23P01"
          ? "That range was just reserved by another action. Pick another slot."
          : `Could not create the reservation: ${error.message}`
      );
      fetchAll();
      return;
    }
    clearSelection();
    fetchAll();
  };

  // Block for repair → repair_slots row. Same three-source re-check (can't block an
  // already-taken slot). repair_slots has no DB overlap constraint, so this check is
  // the only guard.
  const createRepairFromGrid = async (systemId: string, slots: number[]) => {
    if (slots.length === 0) return;
    const sortedSlots = [...slots].sort((a, b) => a - b);
    setPanelSaving(true);
    setPanelError("");

    const clash = await findLiveClash(systemId, selectedDate, sortedSlots);
    if (clash !== null) {
      setPanelError(`${formatHour(clash)} was just taken on this system. Pick another slot.`);
      setPanelSaving(false);
      fetchAll();
      return;
    }

    const { error } = await supabase.from("repair_slots").insert({
      cafe_id: cafeId,
      system_id: systemId,
      repair_date: selectedDate,
      start_hour: sortedSlots[0],
      end_hour: sortedSlots[sortedSlots.length - 1] + 1,
      reason: repairReason.trim() || null,
    });
    setPanelSaving(false);

    if (error) {
      setPanelError(`Could not block for repair: ${error.message}`);
      fetchAll();
      return;
    }
    clearSelection();
    fetchAll();
  };

  // Clicking a Reserved (yellow) slot opens its detail popover.
  const openReservationDetail = (systemId: string, hour: number) => {
    const session = walkInSessions.find(
      (s) => s.system_id === systemId && s.session_date === selectedDate && s.slots.includes(hour) && s.status === "scheduled"
    );
    if (session) setReservationDetail(session);
  };

  // Cancel a reservation by setting status='ended' — the grid ignores 'ended'
  // (getSlotStatus filters status !== 'ended') and walk_in_no_overlap excludes it,
  // so the slot frees. No new status value; the status CHECK already permits 'ended'.
  const handleCancelReservation = async (session: WalkInSession) => {
    if (!window.confirm(`Cancel this reservation${session.customer_name ? ` for ${session.customer_name}` : ""}?`)) return;
    setCancellingReservation(true);
    const { data, error } = await supabase
      .from("walk_in_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session.id)
      .select();
    setCancellingReservation(false);
    if (error) {
      alert(`Could not cancel the reservation: ${error.message}\n\nThe reservation is unchanged.`);
      return;
    }
    if (!data || data.length === 0) {
      alert("Could not cancel — the update was blocked (0 rows changed), likely Row-Level Security.\n\nThe reservation is unchanged.");
      return;
    }
    // Drop it locally so the slot frees (green); 'ended' rows aren't refetched anyway.
    setWalkInSessions((prev) => prev.filter((s) => s.id !== session.id));
    setReservationDetail(null);
  };

  const removeRepair = (systemId: string, hour: number) => {
    const repair = repairSlots.find(
      (r) => r.system_id === systemId && r.repair_date === selectedDate && r.start_hour <= hour && r.end_hour > hour
    );
    if (repair && confirm(`Remove repair slot for ${formatHour(hour)}?`)) {
      supabase.from("repair_slots").delete().eq("id", repair.id).then(() => fetchAll());
    }
  };

  // Open the cancel/refund modal for the booking occupying this system+hour today/on
  // the selected day.
  const openCancelModal = (systemId: string, hour: number) => {
    const booking = onlineBookings.find((b) => {
      if (b.system_id !== systemId || b.booking_date !== selectedDate) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return startH <= hour && endH > hour;
    });
    if (booking) setCancelBooking(booking);
  };

  // Identical behavior to BookingsList.handleCancel (Advanced Booking tab): same
  // confirm text, same write, same error/0-rows-RLS handling. Kept as a replica so
  // the History path in BookingsList stays provably untouched.
  const handleCancelBooking = async (booking: OnlineBooking) => {
    const name = booking.players?.[0]?.name || "the customer";
    if (
      !window.confirm(
        `Cancel this booking for ${name}?\n\n` +
          `${booking.start_time}–${booking.end_time} on ${new Date(booking.booking_date).toDateString()}\n` +
          `₹${booking.total_price} will need to be refunded to the customer manually.`
      )
    )
      return;

    setCancellingId(booking.id);
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: "owner_cancelled" })
      .eq("id", booking.id)
      .select();
    setCancellingId(null);

    if (error) {
      alert(`Could not cancel the booking: ${error.message}\n\nThe booking is unchanged.`);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Could not cancel the booking — the update was blocked (0 rows changed).\n\n" +
          "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security).\n\n" +
          "The booking is unchanged."
      );
      return;
    }

    // Drop it from the grid so the slot frees (green); keep the modal open on the
    // cancelled row so its refund reminder is visible until the owner closes it.
    setOnlineBookings((prev) => prev.filter((b) => b.id !== booking.id));
    setCancelBooking((prev) => (prev ? { ...prev, ...data[0] } : prev));
  };

  const handleSlotClick = (systemId: string, hour: number) => {
    if (walkInSystemId !== systemId) {
      setWalkInSystemId(systemId);
      setSelectedWalkInSlots([]);
      setConsecutiveWarning(null);
      setPanelAction(null);
      setPanelError("");
      setResName(""); setResPhone(""); setResNote(""); setRepairReason("");
    }

    // Toggle selection with consecutive check
    setSelectedWalkInSlots((prev) => {
      const isSelected = prev.includes(hour);
      const newSlots = isSelected
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => a - b);

      // Check consecutive
      if (newSlots.length > 1) {
        for (let i = 1; i < newSlots.length; i++) {
          if (newSlots[i] - newSlots[i - 1] !== 1) {
            setConsecutiveWarning(
              `⚠️ Please select only consecutive slots. ${formatHour(newSlots[i - 1])} and ${formatHour(newSlots[i])} are not consecutive.`
            );
            return prev; // Don't update
          }
        }
      }
      setConsecutiveWarning(null);
      return newSlots;
    });
  };

  const handleStartWalkIn = async (systemId: string) => {
    if (selectedWalkInSlots.length === 0) return;
    const check = canStartWalkIn(systemId, selectedWalkInSlots);
    if (!check.allowed) return;

    const conflictingBooking = getConflictingBooking(systemId, selectedWalkInSlots);
    if (conflictingBooking) {
      setConflict({ systemId, selectedSlots: selectedWalkInSlots, conflictingBooking });
      return;
    }
    await createWalkInSession(systemId, selectedWalkInSlots);
  };

  const createWalkInSession = async (systemId: string, slots: number[]) => {
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const today = toLocalDateString(new Date());
    const currentHour = now.getHours();
    const isNow = sortedSlots.includes(currentHour);

    // Re-verify against live data immediately before inserting. The slot buttons
    // are disabled for taken slots, but that guard reads state fetched on load —
    // a second tab, another device, or a customer booking online in the meantime
    // can claim a slot in between. Unlike `bookings`, walk_in_sessions has no DB
    // overlap constraint to catch it afterwards.
    const [{ data: liveWalkIns }, { data: liveBookings }] = await Promise.all([
      supabase
        .from("walk_in_sessions")
        .select("slots, status")
        .eq("system_id", systemId)
        .eq("session_date", today)
        .in("status", ["scheduled", "active"]),
      supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("system_id", systemId)
        .eq("booking_date", today)
        .eq("status", "confirmed"),
    ]);

    const taken = new Set<number>();
    (liveWalkIns || []).forEach((w: any) =>
      (w.slots || []).forEach((h: number) => taken.add(h))
    );
    (liveBookings || []).forEach((b: any) => {
      const s = parseInt(b.start_time.split(":")[0], 10);
      const e = parseInt(b.end_time.split(":")[0], 10);
      for (let h = s; h < e; h++) taken.add(h);
    });

    const clash = sortedSlots.find((h) => taken.has(h));
    if (clash !== undefined) {
      setConsecutiveWarning(
        `⚠️ ${formatHour(clash)} was just taken on this system. Please pick another slot.`
      );
      setSelectedWalkInSlots([]);
      fetchAll();
      return;
    }

    await supabase.from("walk_in_sessions").insert({
      cafe_id: cafeId,
      system_id: systemId,
      status: isNow ? "active" : "scheduled",
      slots: sortedSlots,
      session_date: today,
      start_time: sortedSlots[0],
      end_time: sortedSlots[sortedSlots.length - 1] + 1,
      started_at: isNow ? new Date().toISOString() : null,
    });
    setWalkInSystemId(null);
    setSelectedWalkInSlots([]);
    setConflict(null);
    setConsecutiveWarning(null);
    fetchAll();
  };

  const handleEndSession = async (session: WalkInSession) => {
    const system = systems.find((s) => s.id === session.system_id);
    await supabase.from("walk_in_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);
    const nextBooking = onlineBookings.find((b) => {
      const startH = parseInt(b.start_time.split(":")[0]);
      return b.system_id === session.system_id && startH === session.end_time;
    }) || null;
    const { total } = calculateWalkInPrice(session.slots);
    setEndedSession({ systemName: system?.name || "System", nextBooking, amountToCollect: total });
    fetchAll();
  };

  const resetForm = () => {
    setForm({ name: "", type: "PC", gpu: "", cpu: "", ram: "", console: "" });
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    await supabase.from("gaming_systems").insert({
      cafe_id: cafeId,
      name: form.name,
      type: form.type,
      gpu: form.type === "PC" ? form.gpu : null,
      cpu: form.type === "PC" ? form.cpu : null,
      ram: form.type === "PC" ? form.ram : null,
      console: form.type === "Console" ? form.console : null,
    });
    await fetchAll();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gaming system?")) return;
    await supabase.from("gaming_systems").delete().eq("id", id);
    fetchAll();
  };

  const today = toToday();
  const isToday = selectedDate === today;

  // Today .. today+6, matching the customer-facing booking window and the picker
  // that used to live in the Advanced Booking tab.
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const countForDate = (dateStr: string) =>
    onlineBookings.filter((b) => b.booking_date === dateStr).length;

  const selectedDayLabel = (() => {
    if (isToday) return "Today";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate === toLocalDateString(tomorrow)) return "Tomorrow";
    return new Date(`${selectedDate}T00:00:00`).toDateString();
  })();

  if (loading) return <div className="text-center py-8 text-gray-500">Loading systems...</div>;

  return (
    <div className="space-y-6">

      {/* Cancel / Refund Modal — opened from a Booked (red) slot. Same flow as the
          old Advanced Booking tab. */}
      {cancelBooking && (() => {
        const b = cancelBooking;
        const isCancelled = b.status === "cancelled";
        const primary = b.players?.[0];
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">Booking Details</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isCancelled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                }`}>
                  {b.status || "confirmed"}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{new Date(b.booking_date).toDateString()}</span>
                </p>
                <p>{formatHour(parseInt(b.start_time.split(":")[0]))} – {formatHour(parseInt(b.end_time.split(":")[0]))}</p>
                <p className="flex items-center gap-1 font-semibold text-purple-600">₹{b.total_price}</p>
              </div>

              {/* Player details */}
              {primary ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Player Details</p>
                  <div className="space-y-2">
                    {b.players!.map((player, i) => (
                      <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{player.name || "—"}</span>
                        <span className="text-gray-600">{player.phone || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic mb-4">No player details recorded</p>
              )}

              {/* Refund reminder — shown once the booking is cancelled */}
              {isCancelled && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800 mb-4">
                  <span>
                    Remember to refund <span className="font-semibold">₹{b.total_price}</span> to{" "}
                    <span className="font-semibold">{primary?.name || "the customer"}</span>
                    {" "}({primary?.phone || "no phone on file"}) — refunds are handled manually
                    outside the app in Phase 1.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelBooking(null)}>
                  Close
                </Button>
                {!isCancelled && (
                  <button
                    onClick={() => handleCancelBooking(b)}
                    disabled={cancellingId === b.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-red-400 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancellingId === b.id ? "Cancelling…" : "Cancel Booking"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reservation detail popover — opened from a Reserved (yellow) slot. Mirrors the
          red-slot cancel flow; Cancel Reservation sets status='ended' to free the slot. */}
      {reservationDetail && (() => {
        const r = reservationDetail;
        const sys = systems.find((s) => s.id === r.system_id);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">Reservation</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">reserved</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p className="font-medium text-gray-800">{sys?.name || "System"}</p>
                <p>{new Date(r.session_date).toDateString()}</p>
                <p>{formatHour(r.start_time)} – {formatHour(r.end_time)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{r.customer_name || "—"}</span></p>
                <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{r.customer_phone || "—"}</span></p>
                <p><span className="text-gray-500">Note:</span> <span className="font-medium">{r.note || "—"}</span></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReservationDetail(null)}>Close</Button>
                <button
                  onClick={() => handleCancelReservation(r)}
                  disabled={cancellingReservation}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-red-400 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingReservation ? "Cancelling…" : "Cancel Reservation"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Session End Popup */}
      {endedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">{endedSession.systemName}</span> walk-in session has ended.
            </p>
            {endedSession.amountToCollect !== null && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-4">
                <p className="text-sm text-orange-700">Amount to collect:</p>
                <p className="text-3xl font-bold text-orange-600">₹{endedSession.amountToCollect.toFixed(2)}</p>
              </div>
            )}
            {endedSession.nextBooking && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4 text-left">
                <p className="font-bold text-yellow-800">🔔 Heads Up!</p>
                <p className="text-sm text-yellow-700 mt-1">
                  <span className="font-semibold">{endedSession.nextBooking.players?.[0]?.name || "A customer"}</span> arrives at{" "}
                  {formatHour(parseInt(endedSession.nextBooking.start_time.split(":")[0]))}
                </p>
                {endedSession.nextBooking.players?.[0]?.phone && (
                  <p className="text-sm text-yellow-700">📞 {endedSession.nextBooking.players[0].phone}</p>
                )}
              </div>
            )}
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600" onClick={() => setEndedSession(null)}>
              OK, Got it!
            </Button>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {conflict && !waitingForReschedule && (
        <div className="fixed inset-0 bg-red-900 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🚨</div>
              <h2 className="text-2xl font-bold text-red-600">Booking Conflict!</h2>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
              <p className="font-bold">👤 {conflict.conflictingBooking.players?.[0]?.name || "Online Customer"}</p>
              <p className="text-sm text-gray-600 mt-1">📞 {conflict.conflictingBooking.players?.[0]?.phone || "No phone"}</p>
              <p className="text-sm text-gray-600 mt-1">
                🕐 {formatHour(parseInt(conflict.conflictingBooking.start_time.split(":")[0]))} – {formatHour(parseInt(conflict.conflictingBooking.end_time.split(":")[0]))}
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { setConflict(null); setWalkInSystemId(null); setSelectedWalkInSlots([]); }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div><p className="font-bold">Move Walk-in to Another System</p><p className="text-sm opacity-90">Pick a different free system</p></div>
                </div>
              </button>
              <button onClick={async () => {
                if (!confirm("Cancel this booking and mark refund as pending?")) return;
                // "cancelled" is the only valid status that releases the slot —
                // bookings_status_check allows pending/confirmed/completed/cancelled.
                const { data, error } = await supabase
                  .from("bookings")
                  .update({ status: "cancelled", cancellation_reason: "walkin_conflict_refund" })
                  .eq("id", conflict.conflictingBooking.id)
                  .select();
                if (error) {
                  alert(
                    `Could not cancel the booking: ${error.message}\n\n` +
                    "The walk-in was NOT started — the slot is still held by the online booking."
                  );
                  return;
                }
                if (!data || data.length === 0) {
                  alert(
                    "Could not cancel the booking — the update was blocked (0 rows changed).\n\n" +
                    "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security).\n\n" +
                    "The walk-in was NOT started — the slot is still held by the online booking."
                  );
                  return;
                }
                // Only take the slot once the booking has actually been released.
                await createWalkInSession(conflict.systemId, conflict.selectedSlots);
              }} className="w-full bg-white border-2 border-red-400 hover:bg-red-50 text-red-600 font-bold py-3 px-6 rounded-xl text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div><p className="font-bold">Cancel Online Booking & Refund</p><p className="text-sm opacity-80">Customer gets full refund</p></div>
                </div>
              </button>
              <button onClick={() => setWaitingForReschedule(true)}
                className="w-full bg-white border-2 border-blue-400 hover:bg-blue-50 text-blue-600 font-bold py-3 px-6 rounded-xl text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div><p className="font-bold">Call Customer to Reschedule</p><p className="text-sm opacity-80">Send reschedule request</p></div>
                </div>
              </button>
            </div>
            <button onClick={() => { setConflict(null); setSelectedWalkInSlots([]); }}
              className="w-full mt-4 text-gray-500 text-sm font-medium">← Go Back</button>
          </div>
        </div>
      )}

      {/* Waiting for Reschedule */}
      {waitingForReschedule && conflict && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2">Waiting for Reschedule</h2>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-2xl font-bold text-blue-700">📞 {conflict.conflictingBooking.players?.[0]?.phone || "No phone"}</p>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-green-500 hover:bg-green-600" onClick={async () => {
                // The customer agreed to give up this slot, so the booking must be
                // released — "cancelled" is the only valid status that frees it.
                const { data, error } = await supabase
                  .from("bookings")
                  .update({ status: "cancelled", cancellation_reason: "customer_agreed_reschedule" })
                  .eq("id", conflict.conflictingBooking.id)
                  .select();
                if (error) {
                  alert(
                    `Could not release the booking: ${error.message}\n\n` +
                    "The slot is still held by the online booking."
                  );
                  return;
                }
                if (!data || data.length === 0) {
                  alert(
                    "Could not release the booking — the update was blocked (0 rows changed).\n\n" +
                    "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security).\n\n" +
                    "The slot is still held by the online booking."
                  );
                  return;
                }
                setWaitingForReschedule(false); setConflict(null); setSelectedWalkInSlots([]); fetchAll();
              }}>✅ Customer Agreed — Request Sent</Button>
              <Button variant="outline" className="w-full" onClick={() => setWaitingForReschedule(false)}>← Back to Options</Button>
            </div>
          </div>
        </div>
      )}

      {/* Systems Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gaming Systems ({systems.length})</h2>
          <Button onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
            <Plus className="w-4 h-4" /> Add System
          </Button>
        </div>

        {/* 7-day date picker — pick which day's schedule the grids below show.
            Badges count that day's confirmed bookings. */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
          <div className="flex items-center gap-0 overflow-x-auto">
            {next7Days.map((date, index) => {
              const dateStr = toLocalDateString(date);
              const { day, dateNum, month } = formatDateShort(date);
              const isSelected = dateStr === selectedDate;
              const count = countForDate(dateStr);
              return (
                <button
                  key={dateStr}
                  onClick={() => selectDate(dateStr)}
                  className={`flex-shrink-0 px-5 py-3 flex flex-col items-center justify-center min-w-[84px] transition-all ${
                    isSelected ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  } ${index !== 0 ? "border-l border-gray-200" : ""}`}
                >
                  <div className="text-xs font-medium">{day}</div>
                  <div className="text-2xl font-bold my-0.5">{dateNum}</div>
                  <div className="text-[10px] font-medium">{month}</div>
                  <span className={`mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    count === 0 ? "opacity-0" : isSelected ? "bg-white text-purple-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!isToday && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 text-sm text-blue-700">
            Viewing <span className="font-semibold">{selectedDayLabel}</span>. Tap a free slot to reserve it or
            block it for repair, a red slot to cancel a booking, or a yellow slot to manage a reservation.
            Starting a live walk-in is only available on today's schedule.
          </div>
        )}

        {/* Add System Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">System Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. System 1" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PC" | "Console" })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400">
                  <option value="PC">PC</option>
                  <option value="Console">Console</option>
                </select>
              </div>
            </div>
            {form.type === "PC" ? (
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">GPU</label>
                  <input type="text" value={form.gpu} onChange={(e) => setForm({ ...form, gpu: e.target.value })}
                    placeholder="NVIDIA RTX 4090" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">CPU</label>
                  <input type="text" value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })}
                    placeholder="Intel Core i9" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">RAM</label>
                  <input type="text" value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })}
                    placeholder="64GB DDR5" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" /></div>
              </div>
            ) : (
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Console</label>
                <input type="text" value={form.console} onChange={(e) => setForm({ ...form, console: e.target.value })}
                  placeholder="PS5 / Xbox Series X" className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" /></div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !form.name}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                {saving ? "Adding..." : "Add System"}
              </Button>
            </div>
          </div>
        )}

        {/* System Cards with Slot Grid */}
        <div className="space-y-4">
          {systems.map((system) => {
            const isSelecting = walkInSystemId === system.id;
            const check = isSelecting && selectedWalkInSlots.length > 0
              ? canStartWalkIn(system.id, selectedWalkInSlots)
              : { allowed: true, reason: "" };
            const isWarning = check.reason.startsWith("warning:");
            const warningMsg = check.reason.replace("warning:", "");
            const { breakdown, total } = isSelecting && selectedWalkInSlots.length > 0
              ? calculateWalkInPrice(selectedWalkInSlots)
              : { breakdown: [], total: 0 };
            const nextSlot = isSelecting && selectedWalkInSlots.length > 0
              ? Math.max(...selectedWalkInSlots) + 1
              : null;
            const nextSlotFree = nextSlot !== null
              && getSlotStatus(system.id, nextSlot) === "available"
              && nextSlot < closeHour;
            // "Now" selection = starts at the current hour today → the walk-in-now flow
            // (live pricing / cutoff / conflict). Anything else is a "later" selection →
            // Reserve / Block-for-repair.
            const isNowSelection = isToday && selectedWalkInSlots.length > 0
              && selectedWalkInSlots[0] === now.getHours();

            return (
              <div key={system.id} className="bg-white rounded-xl shadow-md p-5 border-2 border-gray-200">
                {/* System header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{system.name}</h3>
                    {system.type === "PC" ? (
                      <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                        {system.gpu && <span>{system.gpu}</span>}
                        {system.cpu && <span>• {system.cpu}</span>}
                        {system.ram && <span>• {system.ram}</span>}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">{system.console} — Console</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(system.id)}
                    className="text-red-400 hover:bg-red-50 p-1 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Full Day Slot Grid */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    {isToday
                      ? "Today's Schedule — tap a free slot to start a walk-in, reserve, or block"
                      : `${selectedDayLabel} — tap free to reserve / block · red = cancel · yellow = manage`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {todaySlots.map((hour) => {
                      const slotStatus = getSlotStatus(system.id, hour);
                      const isSelected = isSelecting && selectedWalkInSlots.includes(hour);
                      const isPast = isToday && hour < now.getHours();
                      // Free slots are actionable on today (walk-in/reserve/repair) and on
                      // future days (reserve/repair). Only today's past hours are inert.
                      const freeActionable = !isPast;

                      return (
                        <button
                          key={hour}
                          onClick={() => {
                            if (slotStatus === "booked") { openCancelModal(system.id, hour); return; }
                            if (slotStatus === "reserved") { openReservationDetail(system.id, hour); return; }
                            if (slotStatus === "occupied") return;
                            if (slotStatus === "repair") { removeRepair(system.id, hour); return; }
                            if (!freeActionable) return;
                            handleSlotClick(system.id, hour);
                          }}
                          disabled={slotStatus === "occupied"}
                          title={
                            slotStatus === "booked" ? "Booked online — tap to cancel / refund" :
                            slotStatus === "occupied" ? "Walk-in in progress" :
                            slotStatus === "reserved" ? "Reserved — tap to view / cancel" :
                            slotStatus === "repair" ? "Under repair — tap to remove" :
                            isPast ? "Past slot" :
                            "Tap to select"
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500"
                              : slotStatus === "occupied"
                              ? "bg-orange-400 text-white border-orange-400 cursor-not-allowed"
                              : slotStatus === "reserved"
                              ? "bg-yellow-400 text-white border-yellow-400 cursor-pointer hover:bg-yellow-500"
                              : slotStatus === "booked"
                              ? "bg-red-500 text-white border-red-500 cursor-pointer hover:bg-red-600"
                              : slotStatus === "repair"
                              ? "bg-purple-500 text-white border-purple-500 cursor-pointer hover:bg-purple-600"
                              : isPast
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                              : "bg-white text-green-700 border-green-500 hover:bg-green-50 cursor-pointer"
                          }`}
                        >
                          {slotStatus === "booked" ? "BKD" :
                           slotStatus === "occupied" ? "OCC" :
                           slotStatus === "reserved" ? "RES" :
                           slotStatus === "repair" ? "REP" :
                           formatHour(hour).replace(":00", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend for this system */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block"></span>Free</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500 inline-block"></span>Occupied</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400 inline-block"></span>Reserved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block"></span>Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500 inline-block"></span>Repair</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-gray-300 inline-block"></span>Past</span>
                </div>

                {/* Selection action panel — appears inline when slots are selected.
                    now-path (starts at current hour today) => walk-in flow; otherwise
                    => Reserve / Block-for-repair. panelAction opens a sub-form either way. */}
                {isSelecting && (
                  <div className="border-t pt-4 mt-2">
                    {consecutiveWarning && (
                      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 mb-3 text-xs text-yellow-700 font-medium">
                        {consecutiveWarning}
                      </div>
                    )}
                    {panelError && (
                      <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-3 text-xs text-red-700 font-medium">
                        {panelError}
                      </div>
                    )}

                    {selectedWalkInSlots.length > 0 && (
                      <p className="text-xs text-gray-600 mb-3">
                        Selected{" "}
                        <span className="font-semibold">
                          {selectedWalkInSlots.map((h) => formatHour(h).replace(":00", "")).join(", ")}
                        </span>{" "}
                        on {selectedDayLabel}
                      </p>
                    )}

                    {panelAction === "reserve" ? (
                      /* Reserve sub-form — all fields optional */
                      <div className="space-y-2">
                        <input value={resName} onChange={(e) => setResName(e.target.value)}
                          placeholder="Customer name (optional)"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                        <input value={resPhone} onChange={(e) => setResPhone(e.target.value)}
                          placeholder="Phone (optional)"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                        <textarea value={resNote} onChange={(e) => setResNote(e.target.value)} rows={2}
                          placeholder="Note (optional)"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-purple-400" />
                        <div className="flex gap-2">
                          <button onClick={() => { setPanelAction(null); setPanelError(""); }}
                            className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                          <button onClick={() => createReservation(system.id, selectedWalkInSlots)}
                            disabled={panelSaving || selectedWalkInSlots.length === 0}
                            className="flex-1 text-xs py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-semibold">
                            {panelSaving ? "Reserving…" : "Confirm Reservation"}
                          </button>
                        </div>
                      </div>
                    ) : panelAction === "repair" ? (
                      /* Block-for-repair sub-form — reason optional */
                      <div className="space-y-2">
                        <input value={repairReason} onChange={(e) => setRepairReason(e.target.value)}
                          placeholder="Reason (optional) — e.g. GPU replacement"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                        <div className="flex gap-2">
                          <button onClick={() => { setPanelAction(null); setPanelError(""); }}
                            className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                          <button onClick={() => createRepairFromGrid(system.id, selectedWalkInSlots)}
                            disabled={panelSaving || selectedWalkInSlots.length === 0}
                            className="flex-1 text-xs py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold">
                            {panelSaving ? "Blocking…" : "Confirm Repair Block"}
                          </button>
                        </div>
                      </div>
                    ) : isNowSelection ? (
                      /* now-path: the existing walk-in-now flow (unchanged), + Block-for-repair */
                      <>
                        {selectedWalkInSlots.length > 0 && (
                          <>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                              <p className="text-xs font-semibold text-orange-800 mb-1">Price Breakdown:</p>
                              {breakdown.map((line, i) => (
                                <p key={i} className="text-xs text-orange-700">{line}</p>
                              ))}
                              <p className="text-xs font-bold text-orange-900 mt-1 border-t border-orange-200 pt-1">
                                Total to collect: ₹{total.toFixed(2)}
                              </p>
                            </div>
                            {!check.allowed && (
                              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-3">
                                <p className="text-xs font-semibold text-red-700">❌ Cannot start walk-in</p>
                                <p className="text-xs text-red-600 mt-0.5">{check.reason}</p>
                              </div>
                            )}
                            {check.allowed && isWarning && (
                              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 mb-3">
                                <p className="text-xs font-semibold text-yellow-700">⚠️ Short session</p>
                                <p className="text-xs text-yellow-600">{warningMsg}</p>
                              </div>
                            )}
                            {check.allowed && nextSlotFree && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                                <p className="text-xs text-blue-700">💡 {formatHour(nextSlot!)} is also free.</p>
                                <button
                                  onClick={() => setSelectedWalkInSlots(prev => [...prev, nextSlot!].sort((a, b) => a - b))}
                                  className="text-xs text-blue-600 font-semibold underline">
                                  Add {formatHour(nextSlot!)} too →
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex gap-2">
                          <button onClick={clearSelection}
                            className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                          <button onClick={() => { setPanelAction("repair"); setPanelError(""); }}
                            className="flex-1 text-xs py-2 border-2 border-purple-400 text-purple-600 rounded-lg hover:bg-purple-50 font-semibold">🔧 Block for repair</button>
                          <button onClick={() => handleStartWalkIn(system.id)}
                            disabled={selectedWalkInSlots.length === 0 || !check.allowed}
                            className="flex-1 text-xs py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold">Start Walk-in →</button>
                        </div>
                      </>
                    ) : (
                      /* later-path: Reserve / Block-for-repair choice */
                      <div className="flex gap-2">
                        <button onClick={clearSelection}
                          className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => { setPanelAction("reserve"); setPanelError(""); }}
                          disabled={selectedWalkInSlots.length === 0}
                          className="flex-1 text-xs py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-semibold">📅 Reserve</button>
                        <button onClick={() => { setPanelAction("repair"); setPanelError(""); }}
                          disabled={selectedWalkInSlots.length === 0}
                          className="flex-1 text-xs py-2 border-2 border-purple-400 text-purple-600 rounded-lg hover:bg-purple-50 font-semibold">🔧 Block for repair</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}