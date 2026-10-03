import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { effectiveSystemPrice } from "../utils/pricing";
import { hoursForUniformSchedule, type CafeHoursSchedule } from "../utils/cafeHours";
import { toLocalDateString } from "../utils/date";
import { Monitor, Gamepad2, X, Play, Square, Plus, Clock, Check } from "lucide-react";

interface Props {
  cafeId: string;
  pricePerHour: number;
}

interface Sys {
  id: string;
  name: string;
  type: string | null;
  price_per_hour: number | null;
  gpu: string | null;
  cpu: string | null;
  ram: string | null;
  console: string | null;
}
interface WalkIn {
  id: string;
  system_id: string;
  status: "scheduled" | "active" | "ended";
  slots: number[];
  session_date: string;
  start_time: number;
  end_time: number;
  started_at: string | null;
  open_ended?: boolean;
}
interface Booking {
  id: string;
  system_id: string;
  start_time: string;
  end_time: string;
  players: { name: string; phone: string }[] | null;
}
interface Repair {
  system_id: string;
  start_hour: number;
  end_hour: number;
}

type TileState = "available" | "occupied" | "reserved" | "booked" | "repair" | "closed";

type Sheet =
  | { kind: "settle"; sessionId: string }
  | { kind: "info"; systemId: string }
  | null;

// Duration the owner is seating for, chosen up front. null = "Open" (start the clock,
// settle on exit). A number N = seat N continuous hours from now.
type SeatFor = number | null;
const DURATIONS: SeatFor[] = [null, 1, 2, 3, 4];

// Compact hardware identifier so the owner can spot the physical machine.
function specLine(s: Sys): string {
  if (s.type === "Console") return s.console || "Console";
  const parts = [s.gpu, s.cpu, s.ram].filter(Boolean);
  return parts.length ? parts.join(" · ") : "PC";
}

export function CounterMode({ cafeId, pricePerHour }: Props) {
  const [systems, setSystems] = useState<Sys[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [hoursRow, setHoursRow] = useState<CafeHoursSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [seatFor, setSeatFor] = useState<SeatFor>(null);
  const [toast, setToast] = useState<string | null>(null);
  const extendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const today = toLocalDateString(new Date());

  const fetchAll = useCallback(async () => {
    const [{ data: sys }, { data: wi }, { data: bk }, { data: rp }, { data: hrs }] = await Promise.all([
      supabase.from("gaming_systems").select("id, name, type, price_per_hour, gpu, cpu, ram, console").eq("cafe_id", cafeId).order("created_at", { ascending: true }),
      supabase.from("walk_in_sessions").select("*").eq("cafe_id", cafeId).eq("session_date", today).in("status", ["scheduled", "active"]),
      supabase.from("bookings").select("id, system_id, start_time, end_time, players").eq("cafe_id", cafeId).eq("booking_date", today).eq("status", "confirmed"),
      supabase.from("repair_slots").select("system_id, start_hour, end_hour").eq("cafe_id", cafeId).eq("repair_date", today),
      supabase.from("cafe_hours").select("open_time, close_time").eq("cafe_id", cafeId).limit(1).maybeSingle(),
    ]);
    setSystems(sys || []);
    setWalkIns(wi || []);
    setBookings(bk || []);
    setRepairs(rp || []);
    setHoursRow((hrs as CafeHoursSchedule) ?? null);
    setLoading(false);
  }, [cafeId, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const currentHour = now.getHours();
  const bookableHours = hoursForUniformSchedule(hoursRow ?? { open_time: "08:00", close_time: "22:00" });
  const bookableSet = new Set(bookableHours);
  const openNow = bookableSet.has(currentHour);

  const rateFor = (sysId: string) =>
    effectiveSystemPrice(systems.find((s) => s.id === sysId)?.price_per_hour, pricePerHour);

  const activeFor = (sysId: string) => walkIns.find((w) => w.status === "active" && w.system_id === sysId);
  const reservedFor = (sysId: string) =>
    walkIns.find((w) => w.status === "scheduled" && w.system_id === sysId && w.slots.includes(currentHour));

  // Is this hour claimable right now? bookable + not held by any confirmed booking,
  // repair, or non-ended walk-in today. Mirrors findSlotConflicts' sources exactly.
  const isHourFree = (sysId: string, hour: number) => {
    if (!bookableSet.has(hour)) return false;
    if (walkIns.some((w) => w.system_id === sysId && w.slots.includes(hour))) return false;
    if (repairs.some((r) => r.system_id === sysId && r.start_hour <= hour && r.end_hour > hour)) return false;
    if (bookings.some((b) => {
      if (b.system_id !== sysId) return false;
      const s = parseInt(b.start_time.split(":")[0], 10);
      const e = parseInt(b.end_time.split(":")[0], 10);
      return s <= hour && e > hour;
    })) return false;
    return true;
  };

  // Consecutive free bookable hours from now — the max a walk-in can run on this PC.
  // ponytail: today-only, no midnight-wrap; a session seated before midnight at a
  // 24h cafe caps at hour 23. Fine for the counter MVP.
  const runway = (sysId: string) => {
    let count = 0;
    for (let h = currentHour; bookableSet.has(h) && isHourFree(sysId, h); h++) count++;
    return count;
  };

  const tileState = (sysId: string): TileState => {
    if (activeFor(sysId)) return "occupied";
    if (reservedFor(sysId)) return "reserved";
    if (repairs.some((r) => r.system_id === sysId && r.start_hour <= currentHour && r.end_hour > currentHour)) return "repair";
    if (bookings.some((b) => {
      if (b.system_id !== sysId) return false;
      const s = parseInt(b.start_time.split(":")[0], 10);
      const e = parseInt(b.end_time.split(":")[0], 10);
      return s <= currentHour && e > currentHour;
    })) return "booked";
    if (!openNow) return "closed";
    return "available";
  };

  const fmtHour = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    if (hh === 0) return "12 AM";
    if (hh < 12) return `${hh} AM`;
    if (hh === 12) return "12 PM";
    return `${hh - 12} PM`;
  };

  // started_at is a `timestamp without time zone` written as UTC via toISOString().
  // Supabase returns it zone-less ("...T09:00:00"), which new Date() would read as
  // LOCAL — a phantom IST offset (~5.5h). Append "Z" when no zone is present so it's
  // parsed back as the UTC instant we actually stored.
  const parseTs = (t: string) =>
    new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : t + "Z");

  const elapsedMin = (s: WalkIn) =>
    s.started_at ? Math.max(0, (now.getTime() - parseTs(s.started_at).getTime()) / 60000) : 0;

  const fmtElapsed = (s: WalkIn) => {
    const total = Math.floor(elapsedMin(s));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}m`;
  };

  // Honest pay-for-time-played: actual elapsed × rate. Rounded to whole rupees
  // (counter collects cash). This is Rule #11's spirit applied at exit, not the
  // pre-start slot estimate.
  const liveAmount = (s: WalkIn) => Math.max(0, Math.round((elapsedMin(s) / 60) * rateFor(s.system_id)));

  // ── Auto-extend open sessions as the clock crosses each hour (while the next
  // hour is actually free). Keeps the PC occupied without the owner touching it.
  useEffect(() => {
    walkIns.forEach((w) => {
      if (w.status !== "active" || !w.open_ended) return;
      const nextHour = Math.max(...w.slots) + 1;
      if (currentHour < nextHour) return; // haven't crossed yet
      if (!isHourFree(w.system_id, nextHour)) return; // blocked ahead — can't roll over
      const key = `${w.id}:${nextHour}`;
      if (extendingRef.current.has(key)) return;
      extendingRef.current.add(key);
      supabase
        .from("walk_in_sessions")
        .update({ slots: [...w.slots, nextHour], end_time: nextHour + 1 })
        .eq("id", w.id)
        .then(() => fetchAll())
        .then(() => extendingRef.current.delete(key));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, walkIns]);

  const seat = async (systemId: string, hours: number | null) => {
    // hours === null → open-ended (claim current hour, roll over automatically)
    const want = hours ?? 1;
    // Build the consecutive slots from now. Re-check each against live data so a
    // slot claimed since load (another device / an online booking) can't slip in.
    const slots: number[] = [];
    for (let h = currentHour; h < currentHour + want; h++) {
      if (!isHourFree(systemId, h)) break;
      slots.push(h);
    }
    if (slots.length === 0) {
      setToast("That slot was just taken. Try again.");
      setSheet(null);
      fetchAll();
      return;
    }

    const { error } = await supabase.from("walk_in_sessions").insert({
      cafe_id: cafeId,
      system_id: systemId,
      status: "active",
      slots,
      session_date: today,
      start_time: slots[0],
      end_time: slots[slots.length - 1] + 1,
      started_at: new Date().toISOString(),
      open_ended: hours === null,
    });
    if (error) {
      setToast(error.message.includes("23P01") ? "That slot was just taken. Try again." : `Couldn't seat: ${error.message}`);
    } else {
      const name = systems.find((s) => s.id === systemId)?.name || "PC";
      setToast(hours === null ? `${name} — clock started` : `${name} — seated for ${want}h`);
    }
    setSheet(null);
    fetchAll();
  };

  const settle = async (session: WalkIn) => {
    const amount = liveAmount(session);
    const name = systems.find((s) => s.id === session.system_id)?.name || "PC";
    await supabase.from("walk_in_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);
    setSheet(null);
    setToast(`${name} ended · collect ₹${amount}`);
    fetchAll();
  };

  const addHour = async (session: WalkIn) => {
    const nextHour = Math.max(...session.slots) + 1;
    if (!isHourFree(session.system_id, nextHour)) {
      setToast(`Can't extend — ${fmtHour(nextHour)} is already taken.`);
      return;
    }
    await supabase.from("walk_in_sessions").update({
      slots: [...session.slots, nextHour],
      end_time: nextHour + 1,
    }).eq("id", session.id);
    fetchAll();
  };

  const startReserved = async (session: WalkIn) => {
    // Reserved for the current hour → just flip to active (its slot is already held).
    await supabase.from("walk_in_sessions").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);
    setSheet(null);
    fetchAll();
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const onTile = (sysId: string) => {
    const st = tileState(sysId);
    if (st === "available") {
      if (seatFor === null) { seat(sysId, null); return; } // Open — one tap
      const r = runway(sysId);
      if (r >= seatFor) { seat(sysId, seatFor); return; } // fits the chosen hours
      // Doesn't fit — the board already shows it dimmed; guide instead of mis-seating.
      const name = systems.find((s) => s.id === sysId)?.name || "This machine";
      setToast(`${name} only has ${r}h free — pick ${r}h or Open to seat it.`);
    } else if (st === "occupied") setSheet({ kind: "settle", sessionId: activeFor(sysId)!.id });
    else if (st === "reserved" || st === "booked") setSheet({ kind: "info", systemId: sysId });
    // repair / closed → not actionable
  };

  const freeCount = systems.filter((s) => tileState(s.id) === "available").length;
  const busyCount = systems.filter((s) => tileState(s.id) === "occupied").length;
  // When a specific duration is chosen, how many machines can actually hold it.
  const fitCount = seatFor === null
    ? freeCount
    : systems.filter((s) => tileState(s.id) === "available" && runway(s.id) >= seatFor).length;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading the counter…</div>;

  if (systems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">
        <Monitor className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium mb-1">No machines yet</p>
        <p className="text-sm">Add gaming systems in the Gaming Systems tab, then seat walk-ins here.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Counter</h2>
          <p className="text-sm text-gray-500">
            {seatFor === null
              ? "Tap a free machine to start the clock."
              : `Tap a highlighted machine to seat ${seatFor}h.`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> {busyCount} in use
        </span>
      </div>

      {/* Duration selector — choose how long the customer wants, the board answers */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl bg-white border border-gray-200">
        <span className="text-sm font-semibold text-gray-500 mr-1">Seat for</span>
        {DURATIONS.map((d) => {
          const on = seatFor === d;
          return (
            <button
              key={String(d)}
              onClick={() => setSeatFor(d)}
              aria-pressed={on}
              className={`dur-chip px-4 py-2 rounded-lg text-sm font-bold border-2 ${
                on
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {d === null ? "Open" : `${d}h`}
            </button>
          );
        })}
        <span className="ml-auto text-sm font-semibold text-emerald-700">
          {seatFor === null ? `${freeCount} free` : `${fitCount} fit ${seatFor}h`}
        </span>
      </div>

      {!openNow && (
        <div className="mb-4 text-sm bg-slate-100 text-slate-600 rounded-lg px-4 py-2.5">
          The cafe is closed right now, so walk-ins can't be started. Occupied machines can still be settled.
        </div>
      )}

      {/* The board */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {systems.map((s) => {
          const st = tileState(s.id);
          const active = activeFor(s.id);
          const reserved = reservedFor(s.id);
          const Icon = s.type === "Console" ? Gamepad2 : Monitor;

          // With a duration chosen, an available machine either fits it or not.
          const r = st === "available" ? runway(s.id) : 0;
          const fits = seatFor === null || r >= seatFor;
          // A free machine that can't hold the chosen duration is shown but dimmed.
          const dimmed = st === "available" && !fits;

          const theme =
            st === "available"
              ? fits
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 hover:border-emerald-400"
                : "bg-gray-50 border-gray-200 text-gray-500"
            : st === "occupied" ? "bg-amber-50 border-amber-400 text-amber-900 hover:border-amber-500"
            : st === "reserved" ? "bg-yellow-50 border-yellow-300 text-yellow-900"
            : st === "booked" ? "bg-rose-50 border-rose-300 text-rose-900"
            : st === "repair" ? "bg-violet-50 border-violet-300 text-violet-900"
            : "bg-gray-50 border-gray-200 text-gray-400";

          const actionable = st === "available" || st === "occupied" || st === "reserved" || st === "booked";

          return (
            <button
              key={s.id}
              onClick={() => onTile(s.id)}
              disabled={!actionable}
              className={`counter-tile text-left rounded-2xl border-2 p-4 min-h-[128px] flex flex-col ${theme} ${actionable ? "cursor-pointer" : "cursor-default"} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-[15px]">
                  <Icon className="w-4 h-4 opacity-70" /> {s.name}
                </span>
                {st === "occupied" && <span className="counter-live-dot w-2.5 h-2.5 rounded-full bg-amber-500" />}
              </div>

              {/* Hardware line — identify the physical machine */}
              <p className={`text-xs mt-1 truncate ${dimmed ? "text-gray-400" : "opacity-70"}`} title={specLine(s)}>
                {specLine(s)}
              </p>

              <div className="mt-auto pt-2">
                {st === "occupied" && active ? (
                  <>
                    <div className="text-2xl font-bold tabular-nums leading-none">{fmtElapsed(active)}</div>
                    <div className="text-sm font-semibold mt-1">₹{liveAmount(active)} so far</div>
                    <div className="text-[11px] font-medium opacity-70 mt-0.5">
                      {active.open_ended
                        ? "Open session"
                        : `${active.end_time - active.start_time}h · ends ${fmtHour(active.end_time)}`}
                    </div>
                  </>
                ) : st === "available" ? (
                  fits ? (
                    <>
                      <div className="text-lg font-bold">{seatFor === null ? "Free" : `Fits ${seatFor}h`}</div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {seatFor === null ? "Tap to start clock" : "Tap to seat"} · ₹{rateFor(s.id)}/hr
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-base font-bold">Only {r}h free</div>
                      <div className="text-xs opacity-70 mt-0.5">Booked soon</div>
                    </>
                  )
                ) : st === "reserved" && reserved ? (
                  <>
                    <div className="text-sm font-bold">Reserved</div>
                    <div className="text-xs opacity-70 mt-0.5">Starts {fmtHour(reserved.start_time)} · tap to start</div>
                  </>
                ) : st === "booked" ? (
                  <>
                    <div className="text-sm font-bold">Booked online</div>
                    <div className="text-xs opacity-70 mt-0.5">Tap for details</div>
                  </>
                ) : st === "repair" ? (
                  <div className="text-sm font-bold">Under repair</div>
                ) : (
                  <div className="text-sm font-semibold">Closed</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom sheet */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSheet(null)}
        >
          <div className="counter-scrim absolute inset-0 bg-black/50" />
          <div
            className="counter-sheet relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSheet(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {sheet.kind === "settle" && <SettleSheet sessionId={sheet.sessionId} />}
            {sheet.kind === "info" && <InfoSheet systemId={sheet.systemId} />}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );

  // ── Sheets (closures over state; kept inline so they share helpers) ──

  function SettleSheet({ sessionId }: { sessionId: string }) {
    const session = walkIns.find((w) => w.id === sessionId);
    if (!session) return <p className="text-gray-500">Session ended.</p>;
    const sys = systems.find((s) => s.id === session.system_id)!;
    const amount = liveAmount(session);
    const nextHour = Math.max(...session.slots) + 1;
    const canExtend = isHourFree(session.system_id, nextHour);
    const blockedBy = !canExtend && bookableSet.has(nextHour);

    return (
      <div>
        <h3 className="text-lg font-bold text-gray-900 pr-6 inline-flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" /> {sys.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Playing {fmtElapsed(session)} {session.open_ended ? "· open session" : `· until ${fmtHour(session.end_time)}`}
        </p>

        <div className="my-5 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Collect</p>
          <p className="text-4xl font-bold text-amber-600 tabular-nums">₹{amount}</p>
          <p className="text-xs text-amber-700/80 mt-1">cash / UPI · {Math.floor(elapsedMin(session))} min played</p>
        </div>

        {blockedBy && (
          <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-3">
            Heads up — {fmtHour(nextHour)} is booked online. Wrap up before then.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => addHour(session)}
            disabled={!canExtend}
            className="flex-1 py-3 rounded-xl border-2 border-amber-300 text-amber-700 font-semibold hover:bg-amber-50 inline-flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> 1 hour
          </button>
          <button
            onClick={() => settle(session)}
            className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 inline-flex items-center justify-center gap-1.5"
          >
            <Square className="w-4 h-4" /> End &amp; collect
          </button>
        </div>
      </div>
    );
  }

  function InfoSheet({ systemId }: { systemId: string }) {
    const sys = systems.find((s) => s.id === systemId)!;
    const reserved = reservedFor(systemId);
    if (reserved) {
      return (
        <div>
          <h3 className="text-lg font-bold text-gray-900 pr-6">{sys.name} — reserved</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">Held for {fmtHour(reserved.start_time)}.</p>
          <button
            onClick={() => startReserved(reserved)}
            className="dur-chip w-full py-3.5 rounded-xl bg-amber-500 text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-amber-600"
          >
            <Play className="w-4 h-4" /> Start now
          </button>
        </div>
      );
    }
    // Booked online
    const b = bookings.find((x) => {
      if (x.system_id !== systemId) return false;
      const s = parseInt(x.start_time.split(":")[0], 10);
      const e = parseInt(x.end_time.split(":")[0], 10);
      return s <= currentHour && e > currentHour;
    });
    const cust = b?.players?.[0];
    return (
      <div>
        <h3 className="text-lg font-bold text-gray-900 pr-6">{sys.name} — booked online</h3>
        {b && (
          <p className="text-sm text-gray-500 mt-1">
            {fmtHour(parseInt(b.start_time.split(":")[0], 10))} → {fmtHour(parseInt(b.end_time.split(":")[0], 10))}
          </p>
        )}
        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm">
          <p>👤 <span className="font-semibold">{cust?.name || "—"}</span></p>
          <p className="text-gray-600 mt-0.5">📞 {cust?.phone || "—"}</p>
        </div>
        <p className="text-xs text-gray-400 mt-3">This machine is held for a paying online customer — it can't be given to a walk-in.</p>
      </div>
    );
  }
}
