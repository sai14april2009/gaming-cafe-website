import { useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Square, Play } from "lucide-react";
import { toLocalDateString } from "../utils/date";

interface LiveSessionsProps {
  cafeId: string;
  pricePerHour: number;
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
}

interface GamingSystem {
  id: string;
  name: string;
}

interface OnlineBooking {
  id: string;
  system_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  players: { name: string; phone: string }[] | null;
}

interface OwnerNotice {
  emoji: string;
  title: string;
  message: ReactNode;
  amountToCollect: number | null;
  amountLabel?: string;
  nextBooking: OnlineBooking | null;
}

// A unified Live Now item — either a walk-in session or an active online booking.
type LiveItem =
  | { kind: "walkin"; startHour: number; session: WalkInSession }
  | { kind: "online"; startHour: number; booking: OnlineBooking };

export function LiveSessions({ cafeId, pricePerHour }: LiveSessionsProps) {
  const [sessions, setSessions] = useState<WalkInSession[]>([]);
  const [systems, setSystems] = useState<GamingSystem[]>([]);
  const [onlineBookings, setOnlineBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [notice, setNotice] = useState<OwnerNotice | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = useCallback(async () => {
    const today = toLocalDateString(new Date());

    // Self-heal stale walk-ins. The auto-end check below only ever sees *today's*
    // sessions (they're the only ones fetched), so a session left open on an
    // earlier day stays 'active'/'scheduled' forever and skews reporting. Close
    // out any from previous days before loading.
    await supabase
      .from("walk_in_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("cafe_id", cafeId)
      .lt("session_date", today)
      .in("status", ["active", "scheduled"]);

    const [{ data: sessionsData }, { data: systemsData }, { data: bookingsData }] = await Promise.all([
      supabase.from("walk_in_sessions").select("*").eq("cafe_id", cafeId).in("status", ["active", "scheduled"]).eq("session_date", today),
      supabase.from("gaming_systems").select("id, name").eq("cafe_id", cafeId),
      supabase.from("bookings").select("*").eq("cafe_id", cafeId).eq("booking_date", today).eq("status", "confirmed"),
    ]);
    setSessions(sessionsData || []);
    setSystems(systemsData || []);
    setOnlineBookings(bookingsData || []);
    setLoading(false);
  }, [cafeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-end check (walk-ins only — online bookings simply drop off Live Now when their slot passes)
  useEffect(() => {
    sessions.forEach((session) => {
      if (session.status === "active" && session.started_at) {
        const activeForMs = now.getTime() - new Date(session.started_at).getTime();
        if (now.getHours() >= session.end_time && activeForMs > 2 * 60 * 1000) {
          handleEndSession(session);
        }
      }
      // A reservation nobody turned up for. Once its last slot has passed there is
      // nothing left to start, so close it quietly rather than leaving it sitting in
      // Live Now — and holding its slot — indefinitely.
      if (session.status === "scheduled" && now.getHours() >= session.end_time) {
        expireSession(session);
      }
    });
  }, [now, sessions]);

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const getSystemName = (systemId: string) =>
    systems.find((s) => s.id === systemId)?.name || "Unknown System";

  const nowMinutes = () => now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const parseMinutes = (t: string) => {
    const [h, m] = t.split(":");
    return parseInt(h) * 60 + (parseInt(m) || 0);
  };

  const getProgressPercent = (session: WalkInSession) => {
    const totalMs = (session.end_time - session.start_time) * 60 * 60 * 1000;
    const slotStart = new Date(now);
    slotStart.setHours(session.start_time, 0, 0, 0);
    const elapsed = now.getTime() - slotStart.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
  };

  const getBookingProgressPercent = (booking: OnlineBooking) => {
    const startMin = parseMinutes(booking.start_time);
    const endMin = parseMinutes(booking.end_time);
    const total = endMin - startMin;
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((nowMinutes() - startMin) / total) * 100)));
  };

  const calculatePrice = (slots: number[]) => {
    if (slots.length === 0) return 0;
    const sorted = [...slots].sort((a, b) => a - b);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let total = 0;
    sorted.forEach((slot, i) => {
      const slotEndMinutes = (slot + 1) * 60;
      const minutesPlayed = i === 0
        ? slotEndMinutes - Math.max(currentMinutes, slot * 60)
        : 60;
      total += (minutesPlayed / 60) * pricePerHour;
    });
    return Math.round(total * 100) / 100;
  };

  const handleEndSession = async (session: WalkInSession) => {
    await supabase.from("walk_in_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);
    const nextBooking = onlineBookings.find((b) => {
      const startH = parseInt(b.start_time.split(":")[0]);
      return b.system_id === session.system_id && startH === session.end_time;
    }) || null;
    const amountToCollect = calculatePrice(session.slots);
    setNotice({
      emoji: "⏰",
      title: "Session Complete!",
      message: <><span className="font-semibold">{getSystemName(session.system_id)}</span> walk-in session has ended.</>,
      amountToCollect,
      nextBooking,
    });
    fetchAll();
  };

  // Quiet close for a no-show reservation — no "collect payment" popup, since
  // nobody actually played.
  const expireSession = async (session: WalkInSession) => {
    await supabase.from("walk_in_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);
    fetchAll();
  };

  const handleActivate = async (session: WalkInSession) => {
    const currentHour = new Date().getHours();

    // Activating a reservation outside its own slots detaches the session from the
    // hour the customer is physically using: the PC is occupied, but that hour still
    // shows FREE and an online customer can book it. Only allow it when the current
    // hour is covered — or when they're exactly one hour early and that hour is free,
    // in which case claim it too (proportional pricing already handles the part-hour).
    if (!session.slots.includes(currentHour)) {
      const firstSlot = Math.min(...session.slots);

      if (currentHour + 1 !== firstSlot) {
        alert(
          `This walk-in is reserved for ${formatHour(firstSlot)}, but it's ${formatHour(currentHour)} now.\n\n` +
            `Starting it would leave ${formatHour(currentHour)} showing as free while the customer is playing.\n\n` +
            `Cancel this reservation and start a new walk-in for ${formatHour(currentHour)} instead.`
        );
        return;
      }

      const hourTaken =
        onlineBookings.some((b) => {
          const s = parseInt(b.start_time.split(":")[0]);
          const e = parseInt(b.end_time.split(":")[0]);
          return b.system_id === session.system_id && currentHour >= s && currentHour < e;
        }) ||
        sessions.some(
          (s) =>
            s.id !== session.id &&
            s.system_id === session.system_id &&
            s.slots.includes(currentHour)
        );

      if (hourTaken) {
        alert(
          `Cannot start yet — ${formatHour(currentHour)} is already taken on this system.\n\n` +
            `This walk-in can start at ${formatHour(firstSlot)}.`
        );
        return;
      }

      const ok = confirm(
        `This walk-in is reserved for ${formatHour(firstSlot)}, but it's ${formatHour(currentHour)} now.\n\n` +
          `Add ${formatHour(currentHour)} to the session so the PC shows as occupied from now?\n\n` +
          `The customer is only charged for the minutes actually played.`
      );
      if (!ok) return;

      const newSlots = [...new Set([...session.slots, currentHour])].sort((a, b) => a - b);
      await supabase.from("walk_in_sessions").update({
        status: "active",
        started_at: new Date().toISOString(),
        slots: newSlots,
        start_time: newSlots[0],
        end_time: newSlots[newSlots.length - 1] + 1,
      }).eq("id", session.id);
      fetchAll();
      return;
    }

    await supabase.from("walk_in_sessions").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);
    fetchAll();
  };

  const handleAddHour = async (session: WalkInSession) => {
    const nextHour = session.end_time;
    const conflict = onlineBookings.find((b) => {
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return b.system_id === session.system_id && nextHour >= startH && nextHour < endH;
    });
    if (conflict) {
      alert(`Cannot add hour — ${formatHour(nextHour)} is booked online.`);
      return;
    }
    // Also guard against OTHER walk-ins on this system — most importantly a
    // RESERVED (scheduled) session sitting on the next hour. handleAddBookingHour
    // already checks both sources; without the same check here a walk-in could be
    // extended straight over a reservation, putting two sessions on one PC.
    const walkinConflict = sessions.find(
      (s) =>
        s.id !== session.id &&
        s.system_id === session.system_id &&
        (s.slots.includes(nextHour) ||
          (nextHour >= s.start_time && nextHour < s.end_time))
    );
    if (walkinConflict) {
      alert(
        `Cannot add hour — ${formatHour(nextHour)} is already ` +
          `${walkinConflict.status === "active" ? "occupied by" : "reserved for"} ` +
          `another walk-in on this system.`
      );
      return;
    }
    await supabase.from("walk_in_sessions").update({
      slots: [...session.slots, nextHour],
      end_time: nextHour + 1,
    }).eq("id", session.id);
    fetchAll();
  };

  // --- Online booking controls ---

  const handleAddBookingHour = async (booking: OnlineBooking) => {
    const startH = parseInt(booking.start_time.split(":")[0]);
    const endH = parseInt(booking.end_time.split(":")[0]);
    const nextHour = endH;

    // Conflict check — same availability rule as walk-ins, plus other online bookings.
    // Honors the zero-double-booking rule against BOTH online bookings and walk-ins.
    const onlineConflict = onlineBookings.find((b) => {
      if (b.id === booking.id) return false;
      const bStart = parseInt(b.start_time.split(":")[0]);
      const bEnd = parseInt(b.end_time.split(":")[0]);
      return b.system_id === booking.system_id && nextHour >= bStart && nextHour < bEnd;
    });
    const walkinConflict = sessions.find((s) =>
      s.system_id === booking.system_id &&
      (s.slots.includes(nextHour) || (nextHour >= s.start_time && nextHour < s.end_time))
    );
    if (onlineConflict || walkinConflict) {
      alert(`Cannot add hour — ${formatHour(nextHour)} is already booked on this system.`);
      return;
    }

    const durationHours = endH - startH;
    const perHour = durationHours > 0 ? booking.total_price / durationHours : booking.total_price;
    const extra = Math.round(perHour * 100) / 100;
    const newEnd = `${String(nextHour + 1).padStart(2, "0")}:00`;
    const newTotal = Math.round((booking.total_price + extra) * 100) / 100;

    const { data, error } = await supabase
      .from("bookings")
      .update({ end_time: newEnd, total_price: newTotal })
      .eq("id", booking.id)
      .select();
    if (error) {
      alert(`Could not add hour: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Could not add the hour — the update was blocked (0 rows changed).\n\n" +
        "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security). See the fix instructions."
      );
      return;
    }

    const name = booking.players?.[0]?.name || "the customer";
    setNotice({
      emoji: "💰",
      title: "Extra Hour Added",
      message: <>Collect <span className="font-semibold">₹{extra.toFixed(2)}</span> from <span className="font-semibold">{name}</span> for the extra hour (cash/UPI).</>,
      amountToCollect: extra,
      amountLabel: "Amount to collect:",
      nextBooking: null,
    });
    fetchAll();
  };

  const handleEndBooking = async (booking: OnlineBooking) => {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", booking.id)
      .select();
    if (error) {
      alert(`Could not end booking: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Could not end this booking — the update was blocked (0 rows changed).\n\n" +
        "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security). See the fix instructions."
      );
      return;
    }
    const endH = parseInt(booking.end_time.split(":")[0]);
    const nextBooking = onlineBookings.find((b) =>
      b.id !== booking.id &&
      b.system_id === booking.system_id &&
      parseInt(b.start_time.split(":")[0]) === endH
    ) || null;
    setNotice({
      emoji: "✅",
      title: "Booking Complete!",
      message: <><span className="font-semibold">{getSystemName(booking.system_id)}</span> online booking has ended.</>,
      amountToCollect: null,
      nextBooking,
    });
    fetchAll();
  };

  // Build the merged, start-time-sorted Live Now list.
  const liveItems: LiveItem[] = [
    ...sessions.map((session): LiveItem => ({
      kind: "walkin",
      startHour: session.start_time,
      session,
    })),
    ...onlineBookings
      .filter((b) => {
        const startMin = parseMinutes(b.start_time);
        const endMin = parseMinutes(b.end_time);
        const cur = nowMinutes();
        return cur >= startMin && cur < endMin;
      })
      .map((booking): LiveItem => ({
        kind: "online",
        startHour: parseInt(booking.start_time.split(":")[0]),
        booking,
      })),
  ].sort((a, b) => a.startHour - b.startHour);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading live sessions...</div>;

  return (
    <div className="space-y-4">

      {/* Owner notice popup */}
      {notice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">{notice.emoji}</div>
            <h2 className="text-2xl font-bold mb-2">{notice.title}</h2>
            <p className="text-gray-600 mb-2">{notice.message}</p>
            {notice.amountToCollect !== null && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-4">
                <p className="text-sm text-orange-700">{notice.amountLabel || "Amount to collect:"}</p>
                <p className="text-3xl font-bold text-orange-600">₹{notice.amountToCollect.toFixed(2)}</p>
              </div>
            )}
            {notice.nextBooking && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4 text-left">
                <p className="font-bold text-yellow-800">🔔 Heads Up!</p>
                <p className="text-sm text-yellow-700 mt-1">
                  <span className="font-semibold">{notice.nextBooking.players?.[0]?.name || "A customer"}</span> arrives at{" "}
                  {formatHour(parseInt(notice.nextBooking.start_time.split(":")[0]))}
                </p>
                {notice.nextBooking.players?.[0]?.phone && (
                  <p className="text-sm text-yellow-700">📞 {notice.nextBooking.players[0].phone}</p>
                )}
              </div>
            )}
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-400" onClick={() => setNotice(null)}>
              OK, Got it!
            </Button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold">Live Now</h2>

      {liveItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">
          <p className="text-lg font-medium mb-1">No active sessions</p>
          <p className="text-sm">Start a walk-in from the Gaming Systems tab, or wait for an online booking to begin</p>
        </div>
      ) : (
        liveItems.map((item) => {
          if (item.kind === "walkin") {
            const session = item.session;
            return (
              <div key={`walkin-${session.id}`} className={`bg-white rounded-xl shadow-md p-5 border-2 ${
                session.status === "active" ? "border-orange-400" : "border-yellow-400"
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{getSystemName(session.system_id)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Slots: {session.slots.map(formatHour).join(" → ")}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    session.status === "active"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {session.status === "active" ? "🟠 OCCUPIED" : "🟡 RESERVED"}
                  </span>
                </div>

                {session.status === "active" ? (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Walk-in session</span>
                      <span>Ends {formatHour(session.end_time)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercent(session)}%` }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAddHour(session)}
                        className="flex-1 text-sm py-2 border-2 border-orange-400 text-orange-600 rounded-lg hover:bg-orange-50 font-semibold">
                        + Add 1 Hour
                      </button>
                      <button onClick={() => handleEndSession(session)}
                        className="flex-1 text-sm py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center justify-center gap-1">
                        <Square className="w-4 h-4" /> End Session
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-yellow-700 mb-3">
                      Customer waiting • Starts at {formatHour(session.start_time)}
                    </p>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => handleActivate(session)}>
                      <Play className="w-4 h-4 mr-1" /> Start Session Now
                    </Button>
                  </>
                )}
              </div>
            );
          }

          // Online booking card
          const b = item.booking;
          const startH = parseInt(b.start_time.split(":")[0]);
          const endH = parseInt(b.end_time.split(":")[0]);
          const customer = b.players?.[0];
          return (
            <div key={`online-${b.id}`} className="bg-white rounded-xl shadow-md p-5 border-2 border-blue-400">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{getSystemName(b.system_id)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatHour(startH)} → {formatHour(endH)}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  🌐 Online Booking
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-3 space-y-0.5">
                <p>👤 <span className="font-medium">{customer?.name || "—"}</span></p>
                <p className="text-gray-600">📞 {customer?.phone || "—"}</p>
              </div>

              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Online booking</span>
                <span>Ends {formatHour(endH)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${getBookingProgressPercent(b)}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAddBookingHour(b)}
                  className="flex-1 text-sm py-2 border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold">
                  + Add 1 Hour
                </button>
                <button onClick={() => handleEndBooking(b)}
                  className="flex-1 text-sm py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center justify-center gap-1">
                  <Square className="w-4 h-4" /> End Session
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
