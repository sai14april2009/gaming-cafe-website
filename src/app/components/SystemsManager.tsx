import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Trash2, Plus, Monitor, Play, Square, Clock, Wrench } from "lucide-react";

interface SystemsManagerProps {
  cafeId: string;
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
  players: { name: string; phone: string }[] | null;
}

interface ConflictInfo {
  systemId: string;
  selectedSlots: number[];
  conflictingBooking: OnlineBooking;
}

export function SystemsManager({ cafeId }: SystemsManagerProps) {
  const [systems, setSystems] = useState<GamingSystemRow[]>([]);
  const [walkInSessions, setWalkInSessions] = useState<WalkInSession[]>([]);
  const [repairSlots, setRepairSlots] = useState<RepairSlot[]>([]);
  const [onlineBookings, setOnlineBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  // Walk-in flow state
  const [walkInSystemId, setWalkInSystemId] = useState<string | null>(null);
  const [selectedWalkInSlots, setSelectedWalkInSlots] = useState<number[]>([]);

  // Conflict modal state
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [waitingForReschedule, setWaitingForReschedule] = useState(false);

  // Session end notification
  const [endedSession, setEndedSession] = useState<{ systemName: string; nextBooking: OnlineBooking | null } | null>(null);

  // Add system form
  const [form, setForm] = useState({
    name: "",
    type: "PC" as "PC" | "Console",
    gpu: "", cpu: "", ram: "", console: "",
  });

  // Tick every second for live timer
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for sessions that should auto-notify when ended
  useEffect(() => {
    walkInSessions.forEach((session) => {
      if (session.status === "active" && session.started_at) {
        const startedAt = new Date(session.started_at);
        const durationHours = session.slots.length;
        const durationMs = durationHours * 60 * 60 * 1000;
        const endsAt = new Date(startedAt.getTime() + durationMs);
        const activeForMs = now.getTime() - startedAt.getTime();
        // Only auto-end if session has been active for at least 5 minutes
        // AND the full duration has passed
        if (activeForMs >= durationMs && activeForMs > 5 * 60 * 1000) {
          handleAutoEndSession(session);
        }
      }
    });
  }, [now, walkInSessions]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const [{ data: systemsData }, { data: walkInData }, { data: repairData }, { data: bookingsData }] =
      await Promise.all([
        supabase.from("gaming_systems").select("*").eq("cafe_id", cafeId).order("created_at", { ascending: true }),
        supabase.from("walk_in_sessions").select("*").eq("cafe_id", cafeId).in("status", ["scheduled", "active"]).eq("session_date", today),
        supabase.from("repair_slots").select("*").eq("cafe_id", cafeId).eq("repair_date", today),
        supabase.from("bookings").select("*").eq("cafe_id", cafeId).eq("booking_date", today).eq("status", "confirmed"),
      ]);

    setSystems(systemsData || []);
    setWalkInSessions(walkInData || []);
    setRepairSlots(repairData || []);
    setOnlineBookings(bookingsData || []);
    setLoading(false);
  }, [cafeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const getSystemStatus = (systemId: string) => {
    const currentHour = now.getHours();

    // Check active walk-in
    const activeWalkIn = walkInSessions.find(
      (s) => s.system_id === systemId && s.status === "active"
    );
    if (activeWalkIn) return { type: "walkin_active" as const, data: activeWalkIn };

    // Check scheduled walk-in
    const scheduledWalkIn = walkInSessions.find(
      (s) => s.system_id === systemId && s.status === "scheduled"
    );
    if (scheduledWalkIn) return { type: "walkin_scheduled" as const, data: scheduledWalkIn };

    // Check repair
    const repair = repairSlots.find(
      (r) => r.system_id === systemId && r.start_hour <= currentHour && r.end_hour > currentHour
    );
    if (repair) return { type: "repair" as const, data: repair };

    // Check online booking
    const booking = onlineBookings.find((b) => {
      if (b.system_id !== systemId) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return startH <= currentHour && endH > currentHour;
    });
    if (booking) return { type: "booked" as const, data: booking };

    return { type: "free" as const, data: null };
  };

  const getTimeSlotStatus = (systemId: string, hour: number) => {
    // Check active/scheduled walk-in
    const walkIn = walkInSessions.find(
      (s) => s.system_id === systemId && s.slots.includes(hour) && s.status !== "ended"
    );
    if (walkIn) return walkIn.status === "active" ? "walkin_active" : "walkin_scheduled";

    // Check repair
    const repair = repairSlots.find(
      (r) => r.system_id === systemId && r.start_hour <= hour && r.end_hour > hour
    );
    if (repair) return "repair";

    // Check online booking
    const booking = onlineBookings.find((b) => {
      if (b.system_id !== systemId) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return startH <= hour && endH > hour;
    });
    if (booking) return "booked";

    return "available";
  };

  const getConflictingBooking = (systemId: string, slots: number[]) => {
    return onlineBookings.find((b) => {
      if (b.system_id !== systemId) return false;
      const startH = parseInt(b.start_time.split(":")[0]);
      const endH = parseInt(b.end_time.split(":")[0]);
      return slots.some((slot) => slot >= startH && slot < endH);
    }) || null;
  };

  const handleSlotClick = (systemId: string, hour: number) => {
    const slotStatus = getTimeSlotStatus(systemId, hour);

    // Repair slot — show remove option
    if (slotStatus === "repair") {
      const repair = repairSlots.find(
        (r) => r.system_id === systemId && r.start_hour <= hour && r.end_hour > hour
      );
      if (repair && confirm(`Remove repair slot for ${formatHour(hour)}?`)) {
        supabase.from("repair_slots").delete().eq("id", repair.id).then(() => fetchAll());
      }
      return;
    }

    // Toggle slot selection
    setSelectedWalkInSlots((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const handleStartWalkIn = async (systemId: string) => {
    if (selectedWalkInSlots.length === 0) return;

    const conflictingBooking = getConflictingBooking(systemId, selectedWalkInSlots);
    if (conflictingBooking) {
      setConflict({ systemId, selectedSlots: selectedWalkInSlots, conflictingBooking });
      return;
    }

    await createWalkInSession(systemId, selectedWalkInSlots);
  };

  const createWalkInSession = async (systemId: string, slots: number[]) => {
    const sortedSlots = [...slots].sort((a, b) => a - b);
    const startTime = sortedSlots[0];
    const endTime = sortedSlots[sortedSlots.length - 1] + 1;
    const today = new Date().toISOString().split("T")[0];
    const currentHour = now.getHours();
    const isNow = sortedSlots.includes(currentHour);

    await supabase.from("walk_in_sessions").insert({
      cafe_id: cafeId,
      system_id: systemId,
      status: isNow ? "active" : "scheduled",
      slots: sortedSlots,
      session_date: today,
      start_time: startTime,
      end_time: endTime,
      started_at: isNow ? new Date().toISOString() : null,
    });

    setWalkInSystemId(null);
    setSelectedWalkInSlots([]);
    setConflict(null);
    fetchAll();
  };

  const handleActivateSession = async (session: WalkInSession) => {
    await supabase.from("walk_in_sessions").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);
    fetchAll();
  };

  const handleEndSession = async (session: WalkInSession) => {
    const system = systems.find((s) => s.id === session.system_id);
    await supabase.from("walk_in_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);

    // Check if next hour is booked online
    const nextHour = session.end_time;
    const nextBooking = onlineBookings.find((b) => {
      const startH = parseInt(b.start_time.split(":")[0]);
      return b.system_id === session.system_id && startH === nextHour;
    }) || null;

    setEndedSession({ systemName: system?.name || "System", nextBooking });
    fetchAll();
  };

  const handleAutoEndSession = async (session: WalkInSession) => {
    await handleEndSession(session);
  };

  const getProgressPercent = (session: WalkInSession) => {
    if (!session.started_at) return 0;
    const startedAt = new Date(session.started_at).getTime();
    const totalMs = session.slots.length * 60 * 60 * 1000;
    const elapsedMs = now.getTime() - startedAt;
    return Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  };

  const getEndTime = (session: WalkInSession) => {
    if (!session.started_at) return formatHour(session.end_time);
    const startedAt = new Date(session.started_at);
    const totalMs = session.slots.length * 60 * 60 * 1000;
    const endsAt = new Date(startedAt.getTime() + totalMs);
    return endsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // Generate today's time slots from cafe opening hours
  const todaySlots = Array.from({ length: 15 }, (_, i) => i + 8); // 8AM to 10PM default

  const handleAutoAddHour = async (session: WalkInSession) => {
    const nextHour = session.end_time;
    const conflict = getConflictingBooking(session.system_id, [nextHour]);
    if (conflict) {
      alert(`Cannot add hour — ${formatHour(nextHour)} is booked by ${conflict.players?.[0]?.name || "a customer"}`);
      return;
    }
    await supabase.from("walk_in_sessions").update({
      slots: [...session.slots, nextHour],
      end_time: nextHour + 1,
    }).eq("id", session.id);
    fetchAll();
  };

  // Add system form handlers
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

  if (loading) return <div className="text-center py-8 text-gray-500">Loading systems...</div>;

  return (
    <div className="space-y-6">

      {/* Session End Notification */}
      {endedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-gray-600 mb-4">
              <span className="font-semibold">{endedSession.systemName}</span> walk-in session has ended. The system is now free.
            </p>
            {endedSession.nextBooking && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4 text-left">
                <p className="font-bold text-yellow-800 mb-1">🔔 Heads Up!</p>
                <p className="text-sm text-yellow-700">
                  <span className="font-semibold">{endedSession.nextBooking.players?.[0]?.name || "A customer"}</span> has booked this system at{" "}
                  <span className="font-semibold">{formatHour(parseInt(endedSession.nextBooking.start_time.split(":")[0]))}</span>
                </p>
                {endedSession.nextBooking.players?.[0]?.phone && (
                  <p className="text-sm text-yellow-700 mt-1">
                    📞 {endedSession.nextBooking.players[0].phone}
                  </p>
                )}
              </div>
            )}
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
              onClick={() => setEndedSession(null)}
            >
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
              <p className="text-gray-600 mt-2">
                This system has an online booking that conflicts with your walk-in selection.
              </p>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
              <p className="font-bold text-gray-800">
                👤 {conflict.conflictingBooking.players?.[0]?.name || "Online Customer"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                📞 {conflict.conflictingBooking.players?.[0]?.phone || "No phone recorded"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                🕐 {formatHour(parseInt(conflict.conflictingBooking.start_time.split(":")[0]))} –{" "}
                {formatHour(parseInt(conflict.conflictingBooking.end_time.split(":")[0]))}
              </p>
            </div>

            <p className="text-sm font-semibold text-gray-700 mb-3">Choose how to resolve:</p>

            <div className="space-y-3">
              {/* Option 1 — Big green */}
              <button
                onClick={() => {
                  setConflict(null);
                  setWalkInSystemId(null);
                  setSelectedWalkInSlots([]);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <p className="font-bold">Move Walk-in to Another System</p>
                    <p className="text-sm opacity-90">Pick a different free system</p>
                  </div>
                </div>
              </button>

              {/* Option 2 */}
              <button
                onClick={async () => {
                  if (!confirm("Cancel this online booking and mark refund as pending?")) return;
                  await supabase.from("bookings").update({ status: "cancelled_by_owner" }).eq("id", conflict.conflictingBooking.id);
                  await createWalkInSession(conflict.systemId, conflict.selectedSlots);
                }}
                className="w-full bg-white border-2 border-red-400 hover:bg-red-50 text-red-600 font-bold py-3 px-6 rounded-xl transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <p className="font-bold">Cancel Online Booking & Refund</p>
                    <p className="text-sm opacity-80">Customer gets full refund</p>
                  </div>
                </div>
              </button>

              {/* Option 3 */}
              <button
                onClick={() => setWaitingForReschedule(true)}
                className="w-full bg-white border-2 border-blue-400 hover:bg-blue-50 text-blue-600 font-bold py-3 px-6 rounded-xl transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <p className="font-bold">Call Customer to Reschedule</p>
                    <p className="text-sm opacity-80">Send reschedule request</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => { setConflict(null); setSelectedWalkInSlots([]); }}
              className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Go Back
            </button>
          </div>
        </div>
      )}

      {/* Waiting for Reschedule */}
      {waitingForReschedule && conflict && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2">Waiting for Reschedule</h2>
            <p className="text-gray-600 mb-2">
              Call <span className="font-bold text-purple-600">
                {conflict.conflictingBooking.players?.[0]?.name || "the customer"}
              </span> and ask them to reschedule.
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-2xl font-bold text-blue-700">
                📞 {conflict.conflictingBooking.players?.[0]?.phone || "No phone recorded"}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={async () => {
                  await supabase.from("bookings").update({ status: "reschedule_requested" }).eq("id", conflict.conflictingBooking.id);
                  setWaitingForReschedule(false);
                  setConflict(null);
                  setSelectedWalkInSlots([]);
                  fetchAll();
                }}
              >
                ✅ Customer Agreed — Request Sent
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setWaitingForReschedule(false)}
              >
                ← Back to Options
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Status Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Live System Status</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systems.map((system) => {
            const status = getSystemStatus(system.id);
            const isSelectingThisSystem = walkInSystemId === system.id;

            return (
              <div key={system.id} className={`bg-white rounded-xl shadow-md p-4 border-2 transition-all ${
                status.type === "walkin_active" ? "border-orange-400" :
                status.type === "walkin_scheduled" ? "border-yellow-400" :
                status.type === "repair" ? "border-purple-400" :
                status.type === "booked" ? "border-red-400" :
                isSelectingThisSystem ? "border-purple-500" :
                "border-gray-200"
              }`}>
                {/* System header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{system.name}</h3>
                    <p className="text-xs text-gray-500">
                      {system.type === "PC" ? system.gpu : system.console}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(system.id)}
                    className="text-red-400 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                  status.type === "walkin_active" ? "bg-orange-100 text-orange-700" :
                  status.type === "walkin_scheduled" ? "bg-yellow-100 text-yellow-700" :
                  status.type === "repair" ? "bg-purple-100 text-purple-700" :
                  status.type === "booked" ? "bg-red-100 text-red-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    status.type === "walkin_active" ? "bg-orange-500" :
                    status.type === "walkin_scheduled" ? "bg-yellow-500" :
                    status.type === "repair" ? "bg-purple-500" :
                    status.type === "booked" ? "bg-red-500" :
                    "bg-green-500"
                  }`} />
                  {status.type === "walkin_active" ? "OCCUPIED" :
                   status.type === "walkin_scheduled" ? "WALK-IN SCHEDULED" :
                   status.type === "repair" ? "UNDER REPAIR" :
                   status.type === "booked" ? "BOOKED ONLINE" :
                   "FREE"}
                </div>

                {/* Active walk-in timer */}
                {status.type === "walkin_active" && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Walk-in session</span>
                      <span>Ends {getEndTime(status.data as WalkInSession)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercent(status.data as WalkInSession)}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAutoAddHour(status.data as WalkInSession)}
                        className="flex-1 text-xs py-1.5 px-2 border-2 border-orange-400 text-orange-600 rounded-lg hover:bg-orange-50 font-semibold"
                      >
                        + Add 1 Hour
                      </button>
                      <button
                        onClick={() => handleEndSession(status.data as WalkInSession)}
                        className="flex-1 text-xs py-1.5 px-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center justify-center gap-1"
                      >
                        <Square className="w-3 h-3" /> End Session
                      </button>
                    </div>
                  </div>
                )}

                {/* Scheduled walk-in */}
                {status.type === "walkin_scheduled" && (
                  <div className="mb-3">
                    <p className="text-xs text-yellow-700 mb-2">
                      Customer waiting • Starts at {formatHour((status.data as WalkInSession).start_time)}
                    </p>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-xs py-1.5 h-auto"
                      onClick={() => handleActivateSession(status.data as WalkInSession)}
                    >
                      <Play className="w-3 h-3 mr-1" /> Start Session Now
                    </Button>
                  </div>
                )}

                {/* Booked online — show next free time */}
                {status.type === "booked" && (
                  <p className="text-xs text-red-600 mb-3">
                    Free at {formatHour(parseInt((status.data as OnlineBooking).end_time.split(":")[0]))}
                  </p>
                )}

                {/* Walk-in slot selector */}
                {isSelectingThisSystem ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Select time slots:</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {todaySlots.map((hour) => {
                        const slotStatus = getTimeSlotStatus(system.id, hour);
                        const isSelected = selectedWalkInSlots.includes(hour);
                        const isPast = hour < now.getHours();

                        if (isPast) return null;

                        return (
                          <button
                            key={hour}
                            onClick={() => slotStatus !== "repair" && handleSlotClick(system.id, hour)}
                            disabled={slotStatus === "repair"}
                            className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-orange-500 text-white border-2 border-orange-500"
                                : slotStatus === "available"
                                ? "border-2 border-green-500 text-green-700 hover:bg-green-50"
                                : slotStatus === "booked"
                                ? "border-2 border-red-400 text-red-600 hover:bg-red-50"
                                : slotStatus === "walkin_active" || slotStatus === "walkin_scheduled"
                                ? "border-2 border-orange-400 text-orange-600"
                                : "border-2 border-purple-400 text-purple-600 cursor-not-allowed opacity-60"
                            }`}
                          >
                            {formatHour(hour)}
                          </button>
                        );
                      })}
                    </div>
                    {selectedWalkInSlots.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">
                        Selected: {selectedWalkInSlots.map(formatHour).join(", ")}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setWalkInSystemId(null); setSelectedWalkInSlots([]); }}
                        className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStartWalkIn(system.id)}
                        disabled={selectedWalkInSlots.length === 0}
                        className="flex-1 text-xs py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        Start Walk-in →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Walk-in button — always shown unless active walk-in already */
                  status.type !== "walkin_active" && status.type !== "walkin_scheduled" && (
                    <button
                      onClick={() => { setWalkInSystemId(system.id); setSelectedWalkInSlots([]); }}
                      className="w-full text-xs py-2 border-2 border-orange-400 text-orange-600 rounded-lg hover:bg-orange-50 font-semibold flex items-center justify-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Start Walk-in Session
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add System Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Systems ({systems.length})</h2>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
          >
            <Plus className="w-4 h-4" /> Add System
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">System Name</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. System 1"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                <select value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "PC" | "Console" })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400">
                  <option value="PC">PC</option>
                  <option value="Console">Console</option>
                </select>
              </div>
            </div>
            {form.type === "PC" ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">GPU</label>
                  <input type="text" value={form.gpu}
                    onChange={(e) => setForm({ ...form, gpu: e.target.value })}
                    placeholder="NVIDIA RTX 4090"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">CPU</label>
                  <input type="text" value={form.cpu}
                    onChange={(e) => setForm({ ...form, cpu: e.target.value })}
                    placeholder="Intel Core i9"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">RAM</label>
                  <input type="text" value={form.ram}
                    onChange={(e) => setForm({ ...form, ram: e.target.value })}
                    placeholder="64GB DDR5"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Console</label>
                <input type="text" value={form.console}
                  onChange={(e) => setForm({ ...form, console: e.target.value })}
                  placeholder="PS5 / Xbox Series X"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
              </div>
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
      </div>
    </div>
  );
}