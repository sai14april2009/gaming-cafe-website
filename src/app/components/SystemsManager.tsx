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

export function SystemsManager({ cafeId, pricePerHour, openingTime, closingTime }: SystemsManagerProps) {
  const [systems, setSystems] = useState<GamingSystemRow[]>([]);
  const [walkInSessions, setWalkInSessions] = useState<WalkInSession[]>([]);
  const [repairSlots, setRepairSlots] = useState<RepairSlot[]>([]);
  const [onlineBookings, setOnlineBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

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
    const today = toLocalDateString(new Date());
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const getSlotStatus = (systemId: string, hour: number) => {
    const walkIn = walkInSessions.find(
      (s) => s.system_id === systemId && s.slots.includes(hour) && s.status !== "ended"
    );
    if (walkIn) return walkIn.status === "active" ? "occupied" : "reserved";

    const repair = repairSlots.find(
      (r) => r.system_id === systemId && r.start_hour <= hour && r.end_hour > hour
    );
    if (repair) return "repair";

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

  const handleSlotClick = (systemId: string, hour: number) => {
    if (walkInSystemId !== systemId) {
      setWalkInSystemId(systemId);
      setSelectedWalkInSlots([]);
      setConsecutiveWarning(null);
    }

    const slotStatus = getSlotStatus(systemId, hour);

    // Repair slot — offer to remove
    if (slotStatus === "repair") {
      const repair = repairSlots.find(
        (r) => r.system_id === systemId && r.start_hour <= hour && r.end_hour > hour
      );
      if (repair && confirm(`Remove repair slot for ${formatHour(hour)}?`)) {
        supabase.from("repair_slots").delete().eq("id", repair.id).then(() => fetchAll());
      }
      return;
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

  if (loading) return <div className="text-center py-8 text-gray-500">Loading systems...</div>;

  return (
    <div className="space-y-6">

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
                await supabase.from("bookings").update({ status: "cancelled_by_owner" }).eq("id", conflict.conflictingBooking.id);
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
                await supabase.from("bookings").update({ status: "reschedule_requested" }).eq("id", conflict.conflictingBooking.id);
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
                    Today's Schedule — tap a free slot to start walk-in
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {todaySlots.map((hour) => {
                      const slotStatus = getSlotStatus(system.id, hour);
                      const isSelected = isSelecting && selectedWalkInSlots.includes(hour);
                      const isPast = hour < now.getHours();

                      return (
                        <button
                          key={hour}
                          onClick={() => {
                            if (slotStatus === "booked" || slotStatus === "occupied" || slotStatus === "reserved") return;
                            handleSlotClick(system.id, hour);
                          }}
                          disabled={slotStatus === "booked" || slotStatus === "occupied" || slotStatus === "reserved"}
                          title={
                            slotStatus === "booked" ? "Booked online" :
                            slotStatus === "occupied" ? "Walk-in in progress" :
                            slotStatus === "reserved" ? "Reserved for walk-in" :
                            slotStatus === "repair" ? "Under repair — tap to remove" :
                            isPast ? "Past slot" :
                            "Tap to select for walk-in"
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500"
                              : slotStatus === "occupied"
                              ? "bg-orange-400 text-white border-orange-400 cursor-not-allowed"
                              : slotStatus === "reserved"
                              ? "bg-yellow-400 text-white border-yellow-400 cursor-not-allowed"
                              : slotStatus === "booked"
                              ? "bg-red-500 text-white border-red-500 cursor-not-allowed"
                              : slotStatus === "repair"
                              ? "bg-purple-500 text-white border-purple-500 cursor-pointer"
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

                {/* Walk-in selection panel — appears inline when slots selected */}
                {isSelecting && (
                  <div className="border-t pt-4 mt-2">
                    {consecutiveWarning && (
                      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 mb-3 text-xs text-yellow-700 font-medium">
                        {consecutiveWarning}
                      </div>
                    )}

                    {selectedWalkInSlots.length > 0 && (
                      <>
                        {/* Price breakdown */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-orange-800 mb-1">Price Breakdown:</p>
                          {breakdown.map((line, i) => (
                            <p key={i} className="text-xs text-orange-700">{line}</p>
                          ))}
                          <p className="text-xs font-bold text-orange-900 mt-1 border-t border-orange-200 pt-1">
                            Total to collect: ₹{total.toFixed(2)}
                          </p>
                        </div>

                        {/* Hard block */}
                        {!check.allowed && (
                          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-3">
                            <p className="text-xs font-semibold text-red-700">❌ Cannot start walk-in</p>
                            <p className="text-xs text-red-600 mt-0.5">{check.reason}</p>
                          </div>
                        )}

                        {/* Soft warning */}
                        {check.allowed && isWarning && (
                          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2 mb-3">
                            <p className="text-xs font-semibold text-yellow-700">⚠️ Short session</p>
                            <p className="text-xs text-yellow-600">{warningMsg}</p>
                          </div>
                        )}

                        {/* Next slot suggestion */}
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
                      <button
                        onClick={() => { setWalkInSystemId(null); setSelectedWalkInSlots([]); setConsecutiveWarning(null); }}
                        className="flex-1 text-xs py-2 border-2 border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStartWalkIn(system.id)}
                        disabled={selectedWalkInSlots.length === 0 || !check.allowed}
                        className="flex-1 text-xs py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
                        Start Walk-in →
                      </button>
                    </div>
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