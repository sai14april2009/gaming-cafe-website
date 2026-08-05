import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { GamingSystem } from "../types";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, User, Phone, Monitor, Clock, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { toLocalDateString } from "../utils/date";

interface BookingData {
  systemId: string;
  date: Date;
  timeSlots: number[];
}

interface PlayerInfo {
  name: string;
  phone: string;
}

interface SlotAssignment {
  systemId: string;
  hour: number;
  assignedTo: number | null; // player index
}

export function BookingConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    bookings,
    systems,
    partySize,
    numberOfFriends,
    numberOfHours,
    pricePerHour,
    totalPrice,
    cafeName,
  } = location.state || {};

  const playerCount = partySize === "solo" ? 1 : numberOfFriends;

  const [players, setPlayers] = useState<PlayerInfo[]>(
    Array.from({ length: playerCount }, (_, i) => ({
      name: i === 0 ? "" : "",
      phone: "",
    }))
  );

  const [assignments, setAssignments] = useState<SlotAssignment[]>(
    bookings?.flatMap((b: BookingData) =>
      b.timeSlots.map((hour: number) => ({
        systemId: b.systemId,
        hour,
        assignedTo: partySize === "solo" ? 0 : null,
      }))
    ) || []
  );

  const [activePlayer, setActivePlayer] = useState<number | null>(
    partySize === "solo" ? null : 0
  );
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const formatTime = (hour: number): string => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const getSystemName = (systemId: string) => {
    return systems?.find((s: GamingSystem) => s.id === systemId)?.name || systemId;
  };

  const assignSlot = (systemId: string, hour: number) => {
    if (activePlayer === null) return;

    // Check: player can't be assigned the same hour on different systems
    const conflict = assignments.find(
      (a) =>
        a.assignedTo === activePlayer &&
        a.hour === hour &&
        a.systemId !== systemId
    );
    if (conflict) {
      alert(`Player ${activePlayer + 1} is already assigned a slot at ${formatTime(hour)} on another system!`);
      return;
    }

    // Check: player can't have more than numberOfHours slots
    const playerSlots = assignments.filter(
      (a) => a.assignedTo === activePlayer && !(a.systemId === systemId && a.hour === hour)
    ).length;
    if (playerSlots >= numberOfHours) {
      alert(`Player ${activePlayer + 1} already has ${numberOfHours} slot(s) assigned!`);
      return;
    }

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.systemId === systemId && a.hour === hour) {
          // Toggle: if already assigned to this player, unassign
          if (a.assignedTo === activePlayer) return { ...a, assignedTo: null };
          return { ...a, assignedTo: activePlayer };
        }
        return a;
      })
    );
  };

  const getSlotAssignment = (systemId: string, hour: number) => {
    return assignments.find((a) => a.systemId === systemId && a.hour === hour)?.assignedTo ?? null;
  };

  const playerColors = [
    "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-green-500",
    "bg-yellow-500", "bg-red-500", "bg-indigo-500", "bg-orange-500"
  ];

  const playerBorders = [
    "border-purple-500", "border-pink-500", "border-blue-500", "border-green-500",
    "border-yellow-500", "border-red-500", "border-indigo-500", "border-orange-500"
  ];

  const allSlotsAssigned = assignments.every((a) => a.assignedTo !== null);
  const allPlayersHaveInfo = players.every((p) => p.name.trim() && p.phone.trim());

  const validate = () => {
    const errs: string[] = [];
    players.forEach((p, i) => {
      if (!p.name.trim()) errs.push(`Player ${i + 1} name is required`);
      if (!p.phone.trim()) errs.push(`Player ${i + 1} phone is required`);
      else if (!/^\d{10}$/.test(p.phone.replace(/\D/g, "")))
        errs.push(`Player ${i + 1} phone must be 10 digits`);
    });
    if (partySize === "group" && !allSlotsAssigned)
      errs.push("Please assign all time slots to players");
    return errs;
  };

const handleConfirm = async () => {
    // Fail closed if there's no signed-in user. The flow is login-gated upstream,
    // and both RLS (user_id = auth.uid()) and the NOT NULL constraint on
    // bookings.user_id would reject the insert anyway — but that surfaces as a raw
    // DB error. Catch it here with a clear message instead.
    if (!user) {
      setErrors(["Please log in to book — your session may have expired."]);
      return;
    }

    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setLoading(true);

    try {
      const bookingDate = new Date(bookings[0]?.date);
      const dateStr = toLocalDateString(bookingDate); // FIX #4: local day, not UTC
      const cafeId = bookings[0]?.cafeId;
      const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
      const getSystemName = (systemId: string) =>
        systems?.find((s: GamingSystem) => s.id === systemId)?.name || systemId;

      // FIX #1 & #2: one row per system, split into consecutive runs.
      // e.g. system A picked [10,11,12] -> 1 row 10:00-13:00
      //      system A picked [10,13]    -> 2 rows 10:00-11:00 and 13:00-14:00
      //      systems A,B,C picked       -> at least 3 rows total (one per system)
      type Row = {
        user_id: string | undefined;
        cafe_id: string;
        system_id: string;
        booking_date: string;
        start_time: string;
        end_time: string;
        num_people: number;
        total_price: number;
        status: string;
        players: PlayerInfo[];
      };
      // FIX #5: preserve player-to-slot assignments. Each row = one system + one
      // player + one consecutive run of THAT player's hours on THAT system, so the
      // owner sees exactly who is at each machine (Product Rule #5). Downstream
      // components (LiveSessions, SystemsManager) already read players[0] as "the
      // customer", so this makes them correct for group bookings too.
      // Solo assigns every slot to player 0, so this collapses to one run per
      // system — identical rows to before, just with the correct single player.
      const groups = new Map<
        string,
        { systemId: string; playerIndex: number; hours: number[] }
      >();
      for (const a of assignments) {
        if (a.assignedTo === null) continue; // groups are fully assigned (validated); solo is always 0
        const key = `${a.systemId}__${a.assignedTo}`;
        if (!groups.has(key))
          groups.set(key, { systemId: a.systemId, playerIndex: a.assignedTo, hours: [] });
        groups.get(key)!.hours.push(a.hour);
      }

      const rows: Row[] = [];
      for (const group of groups.values()) {
        if (group.hours.length === 0) continue;
        const hours = [...group.hours].sort((a, b) => a - b);
        const player = players[group.playerIndex];
        let runStart = hours[0];
        let prev = hours[0];
        for (let i = 1; i <= hours.length; i++) {
          const h = hours[i];
          if (h === prev + 1) { prev = h; continue; }
          // Close current run [runStart .. prev]
          const runHours = prev - runStart + 1;
          rows.push({
            user_id: user?.id,
            cafe_id: cafeId,
            system_id: group.systemId,
            booking_date: dateStr,
            start_time: formatHour(runStart),
            end_time: formatHour(prev + 1),
            num_people: 1,
            total_price: runHours * (pricePerHour || 0),
            status: "confirmed",
            players: player ? [player] : [],
          });
          if (i < hours.length) { runStart = h; prev = h; }
        }
      }

      if (rows.length === 0) {
        setErrors(["Nothing to book — no time slots selected."]);
        return;
      }

      // Final guard: never insert a slot that has already started. The booking grid
      // hides past slots, but that is only a UI filter — a tab left open past
      // midnight, or a back-button return to this page, can still submit a stale
      // date/time. Nothing downstream (including the DB constraint) rejects it.
      const nowTs = Date.now();
      const hasPastSlot = rows.some(
        (r) => new Date(`${r.booking_date}T${r.start_time}:00`).getTime() <= nowTs
      );
      if (hasPastSlot) {
        setErrors([
          "That time has already passed. Please go back and choose a slot in the future.",
        ]);
        return;
      }

      // FIX #3: re-check availability right before inserting.
      // Any change since the grid was last loaded (new booking, walk-in, repair) is caught here.
      const systemIds = Array.from(new Set(rows.map((r) => r.system_id)));
      const [{ data: liveBookings }, { data: liveWalkIns }, { data: liveRepairs }] = await Promise.all([
        // PII-free availability via SECURITY DEFINER RPC (see AdvancedBookingInterface).
        // Same { system_id, start_time, end_time } shape as the old table query.
        supabase.rpc("get_booked_slots", {
          p_system_ids: systemIds,
          p_date: dateStr,
        }),
        supabase
          .from("walk_in_sessions")
          .select("system_id, slots, status")
          .in("system_id", systemIds)
          .eq("session_date", dateStr)
          .in("status", ["active", "scheduled"]),
        supabase
          .from("repair_slots")
          .select("system_id, start_hour, end_hour")
          .in("system_id", systemIds)
          .eq("repair_date", dateStr),
      ]);

      const occupied: Record<string, Set<number>> = {};
      const mark = (sysId: string, h: number) => {
        if (!occupied[sysId]) occupied[sysId] = new Set();
        occupied[sysId].add(h);
      };
      (liveBookings || []).forEach((b: any) => {
        const startH = parseInt(b.start_time.split(":")[0], 10);
        const endH = parseInt(b.end_time.split(":")[0], 10);
        for (let h = startH; h < endH; h++) mark(b.system_id, h);
      });
      (liveWalkIns || []).forEach((w: any) => {
        (w.slots as number[] | null || []).forEach((h) => mark(w.system_id, h));
      });
      (liveRepairs || []).forEach((r: any) => {
        for (let h = r.start_hour; h < r.end_hour; h++) mark(r.system_id, h);
      });

      const conflicts: string[] = [];
      for (const row of rows) {
        const startH = parseInt(row.start_time.split(":")[0], 10);
        const endH = parseInt(row.end_time.split(":")[0], 10);
        for (let h = startH; h < endH; h++) {
          if (occupied[row.system_id]?.has(h)) {
            const displayH = h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
            conflicts.push(`${getSystemName(row.system_id)} at ${displayH} was just booked — please go back and pick another slot.`);
          }
        }
      }
      if (conflicts.length > 0) {
        // Dedupe (a multi-hour run can produce the same message multiple times)
        setErrors(Array.from(new Set(conflicts)));
        return;
      }

      // Single multi-row insert — Supabase treats this as one statement.
      const { error } = await supabase.from("bookings").insert(rows);
      if (error) {
        console.error("Booking save error:", error);
        setErrors([`Booking failed: ${error.message}`]);
        return;
      }

      setConfirmed(true);
    } catch (err) {
      console.error(err);
      setErrors(["Something went wrong. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">Your gaming session is booked. See you at {cafeName}!</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm text-gray-600"><span className="font-semibold">Cafe:</span> {cafeName}</p>
            <p className="text-sm text-gray-600"><span className="font-semibold">Players:</span> {playerCount}</p>
            <p className="text-sm text-gray-600"><span className="font-semibold">Total Paid:</span> ₹{totalPrice}</p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Confirm Your Booking</h1>
        <p className="text-gray-500 mb-8">{cafeName}</p>

        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" /> Booking Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-semibold">{new Date(bookings[0]?.date).toDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Party Size</p>
              <p className="font-semibold">{playerCount} {playerCount === 1 ? "person" : "people"}</p>
            </div>
            <div>
              <p className="text-gray-500">Duration</p>
              <p className="font-semibold">{numberOfHours} hour{numberOfHours !== 1 ? "s" : ""} per person</p>
            </div>
            <div>
              <p className="text-gray-500">Systems Booked</p>
              <p className="font-semibold">{systems?.length}</p>
            </div>
          </div>
        </div>

        {/* Player Details */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" /> Player Details
          </h2>
          <div className="space-y-4">
            {players.map((player, i) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${playerBorders[i]} bg-gray-50`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-full ${playerColors[i]} text-white flex items-center justify-center text-sm font-bold`}>
                    {i + 1}
                  </div>
                  <span className="font-semibold">Player {i + 1} {i === 0 ? "(You)" : ""}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={player.name}
                      onChange={(e) => setPlayers((prev) => prev.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      value={player.phone}
                      onChange={(e) => setPlayers((prev) => prev.map((p, idx) => idx === i ? { ...p, phone: e.target.value } : p))}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slot Allocation — only for group */}
        {partySize === "group" && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-600" /> Assign Time Slots to Players
            </h2>
            <p className="text-sm text-gray-500 mb-4">Select a player, then click their time slots to assign them.</p>

            {/* Player selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {players.map((player, i) => (
                <button
                  key={i}
                  onClick={() => setActivePlayer(i)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                    activePlayer === i
                      ? `${playerColors[i]} text-white border-transparent`
                      : `bg-white ${playerBorders[i]} text-gray-700`
                  }`}
                >
                  {player.name || `Player ${i + 1}`}
                </button>
              ))}
            </div>

            {/* Slots per system */}
            {bookings.map((booking: BookingData) => (
              <div key={booking.systemId} className="mb-5">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  {getSystemName(booking.systemId)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {booking.timeSlots.map((hour: number) => {
                    const assignedTo = getSlotAssignment(booking.systemId, hour);
                    return (
                      <button
                        key={hour}
                        onClick={() => assignSlot(booking.systemId, hour)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          assignedTo !== null
                            ? `${playerColors[assignedTo]} text-white border-transparent`
                            : "border-gray-300 bg-white text-gray-600 hover:border-purple-400"
                        }`}
                      >
                        {formatTime(hour)}
                        {assignedTo !== null && (
                          <span className="ml-1 text-xs opacity-80">
                            P{assignedTo + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Price Breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{playerCount} player{playerCount > 1 ? "s" : ""} × {numberOfHours} hour{numberOfHours > 1 ? "s" : ""} × ₹{pricePerHour}/hr</span>
              <span className="font-semibold">₹{totalPrice}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service fee</span>
              <span>₹0</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-purple-600">₹{totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
            {errors.map((e, i) => <p key={i} className="text-red-600 text-sm">• {e}</p>)}
          </div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {loading ? "Confirming..." : `Confirm & Pay ₹${totalPrice}`}
        </Button>

        <p className="text-center text-sm text-gray-400 mt-3">
          You won't be charged until you confirm
        </p>
      </div>
    </div>
  );
}