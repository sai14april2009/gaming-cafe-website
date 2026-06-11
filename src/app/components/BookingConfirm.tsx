import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { GamingSystem } from "../data/mockData";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, User, Phone, Monitor, Clock, Calendar } from "lucide-react";
import { Button } from "./ui/button";

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
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setLoading(true);

    try {
      const { error } = await supabase.from("bookings").insert({
        user_id: user?.id,
        cafe_name: cafeName,
        party_size: playerCount,
        total_price: totalPrice,
        players: players,
        assignments: assignments,
        booking_date: bookings[0]?.date,
        created_at: new Date().toISOString(),
      });

      if (error) console.error("Booking save error:", error);
      setConfirmed(true);
    } catch (err) {
      console.error(err);
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
            <p className="text-sm text-gray-600"><span className="font-semibold">Total Paid:</span> ${totalPrice}</p>
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
              <span className="text-gray-600">{playerCount} player{playerCount > 1 ? "s" : ""} × {numberOfHours} hour{numberOfHours > 1 ? "s" : ""} × ${pricePerHour}/hr</span>
              <span className="font-semibold">${totalPrice}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service fee</span>
              <span>$0</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-purple-600">${totalPrice}</span>
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
          {loading ? "Confirming..." : `Confirm & Pay $${totalPrice}`}
        </Button>

        <p className="text-center text-sm text-gray-400 mt-3">
          You won't be charged until you confirm
        </p>
      </div>
    </div>
  );
}