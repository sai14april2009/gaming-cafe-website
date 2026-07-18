import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Square, Play } from "lucide-react";

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
  players: { name: string; phone: string }[] | null;
}

interface EndedSessionInfo {
  systemName: string;
  nextBooking: OnlineBooking | null;
  amountToCollect: number | null;
}

export function LiveSessions({ cafeId, pricePerHour }: LiveSessionsProps) {
  const [sessions, setSessions] = useState<WalkInSession[]>([]);
  const [systems, setSystems] = useState<GamingSystem[]>([]);
  const [onlineBookings, setOnlineBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [endedSession, setEndedSession] = useState<EndedSessionInfo | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
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

  // Auto-end check
  useEffect(() => {
    sessions.forEach((session) => {
      if (session.status === "active" && session.started_at) {
        const activeForMs = now.getTime() - new Date(session.started_at).getTime();
        if (now.getHours() >= session.end_time && activeForMs > 2 * 60 * 1000) {
          handleEndSession(session);
        }
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

  const getProgressPercent = (session: WalkInSession) => {
    const totalMs = (session.end_time - session.start_time) * 60 * 60 * 1000;
    const slotStart = new Date(now);
    slotStart.setHours(session.start_time, 0, 0, 0);
    const elapsed = now.getTime() - slotStart.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
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
    setEndedSession({ systemName: getSystemName(session.system_id), nextBooking, amountToCollect });
    fetchAll();
  };

  const handleActivate = async (session: WalkInSession) => {
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
    await supabase.from("walk_in_sessions").update({
      slots: [...session.slots, nextHour],
      end_time: nextHour + 1,
    }).eq("id", session.id);
    fetchAll();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading live sessions...</div>;

  return (
    <div className="space-y-4">

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

      <h2 className="text-xl font-bold">Live Now</h2>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-400">
          <p className="text-lg font-medium mb-1">No active sessions</p>
          <p className="text-sm">Start a walk-in from the Gaming Systems tab</p>
        </div>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className={`bg-white rounded-xl shadow-md p-5 border-2 ${
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
        ))
      )}
    </div>
  );
}