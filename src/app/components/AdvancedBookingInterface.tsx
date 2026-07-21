import { useState, useEffect } from "react";
import { Monitor, Cpu, MemoryStick } from "lucide-react";
import { GamingSystem } from "../data/mockData";
import { Button } from "./ui/button";
import { supabase } from "../../supabase";
import { toLocalDateString } from "../utils/date";

interface AdvancedBookingInterfaceProps {
  systems: GamingSystem[];
  cafeOperatingHours: { start: number; end: number };
  onBookingComplete: (bookings: { systemId: string; date: Date; timeSlots: number[] }[]) => void;
  pricePerHour: number;
  partySize: "solo" | "group";
  numberOfFriends: number;
  numberOfHours: number;
}

interface TimeSlotState {
  hour: number;
  // "walkin" = active walk-in (OCCUPIED, orange); "reserved" = scheduled walk-in
  // not yet started (RESERVED, amber) — owner can cancel it, so it's shown
  // distinctly from a paid online "booked" slot.
  status: "available" | "booked" | "repair" | "selected" | "walkin" | "reserved";
}

interface SystemBookingState {
  systemId: string;
  slots: TimeSlotState[];
}

export function AdvancedBookingInterface({
  systems,
  cafeOperatingHours,
  onBookingComplete,
  pricePerHour,
  partySize,
  numberOfFriends,
  numberOfHours,
}: AdvancedBookingInterfaceProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingStates, setBookingStates] = useState<SystemBookingState[]>([]);
  const [conflictWarning, setConflictWarning] = useState<{ systemId: string; message: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const generateTimeSlots = (): number[] => {
    const slots: number[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    for (let hour = cafeOperatingHours.start; hour <= cafeOperatingHours.end; hour++) {
      if (isToday && hour <= currentHour) continue;
      slots.push(hour);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    const fetchBookedSlots = async () => {
      setLoadingSlots(true);
      const dateStr = toLocalDateString(selectedDate);
      const systemIds = systems.map((s) => s.id);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("system_id, start_time, end_time")
        .in("system_id", systemIds)
        .eq("booking_date", dateStr)
        .eq("status", "confirmed");

      const bookedHoursMap: Record<string, Set<number>> = {};
      systemIds.forEach((id) => (bookedHoursMap[id] = new Set()));

      (bookings || []).forEach((b) => {
        if (!b.system_id) return;
        const startH = parseInt(b.start_time?.split(":")[0] || "0", 10);
        const endH = parseInt(b.end_time?.split(":")[0] || "0", 10);
        for (let h = startH; h < endH; h++) {
          bookedHoursMap[b.system_id]?.add(h);
        }
      });

      // Fetch repair slots for this date
      const { data: repairs } = await supabase
        .from("repair_slots")
        .select("system_id, start_hour, end_hour")
        .in("system_id", systemIds)
        .eq("repair_date", dateStr);

      // Fetch active/scheduled walk-in sessions for this date
      const { data: walkIns } = await supabase
        .from("walk_in_sessions")
        .select("system_id, slots, status")
        .in("system_id", systemIds)
        .eq("session_date", dateStr)
        .in("status", ["active", "scheduled"]);

      // Build repair hours map
      const repairHoursMap: Record<string, Set<number>> = {};
      systemIds.forEach((id) => (repairHoursMap[id] = new Set()));
      (repairs || []).forEach((r) => {
        if (!r.system_id) return;
        for (let h = r.start_hour; h < r.end_hour; h++) {
          repairHoursMap[r.system_id]?.add(h);
        }
      });

      // Build walk-in hours maps — active = OCCUPIED (orange), scheduled = RESERVED (amber)
      const activeWalkInMap: Record<string, Set<number>> = {};
      const reservedWalkInMap: Record<string, Set<number>> = {};
      systemIds.forEach((id) => {
        activeWalkInMap[id] = new Set();
        reservedWalkInMap[id] = new Set();
      });
      (walkIns || []).forEach((w) => {
        if (!w.system_id) return;
        const target = w.status === "active" ? activeWalkInMap : reservedWalkInMap;
        (w.slots as number[]).forEach((h) => {
          target[w.system_id]?.add(h);
        });
      });

      const newStates: SystemBookingState[] = systems.map((system) => {
        const slots: TimeSlotState[] = timeSlots.map((hour) => {
          let status: TimeSlotState["status"] = "available";
          if (bookedHoursMap[system.id]?.has(hour)) status = "booked";
          else if (repairHoursMap[system.id]?.has(hour)) status = "repair";
          else if (activeWalkInMap[system.id]?.has(hour)) status = "walkin";
          else if (reservedWalkInMap[system.id]?.has(hour)) status = "reserved";
          return { hour, status };
        });
        return { systemId: system.id, slots };
      });
      setBookingStates(newStates);
      setLoadingSlots(false);
    };

    if (systems.length > 0) fetchBookedSlots();
  }, [selectedDate, systems]);

  const getSystemInfo = (systemId: string) => systems.find((s) => s.id === systemId);

  const formatTime = (hour: number): string => {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  };

  const formatDateShort = (date: Date) => {
    const day = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const dateNum = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return { day, dateNum, month };
  };

  const handleSlotClick = (systemId: string, hour: number) => {
    const currentSlot = bookingStates
      .find((s) => s.systemId === systemId)
      ?.slots.find((slot) => slot.hour === hour);

    const isSelecting = currentSlot?.status === "available";

    if (isSelecting) {
      if (partySize === "solo") {
        const conflictingSystem = bookingStates.find(
          (state) =>
            state.systemId !== systemId &&
            state.slots.some((slot) => slot.hour === hour && slot.status === "selected")
        );
        if (conflictingSystem) {
          const conflictSystemName = getSystemInfo(conflictingSystem.systemId)?.name || "another system";
          setConflictWarning({
            systemId,
            message: `❌ ${formatTime(hour)} is already selected on "${conflictSystemName}". You're playing solo — you can only use one system at a time. Deselect it there first.`,
          });
          setTimeout(() => setConflictWarning(null), 6000);
          return;
        }
      }

      if (partySize === "group") {
        const timeSlotsUsedForThisHour = bookingStates.filter(
          (state) => state.slots.some((slot) => slot.hour === hour && slot.status === "selected")
        ).length;
        if (timeSlotsUsedForThisHour >= numberOfFriends) {
          setConflictWarning({
            systemId,
            message: `❌ All ${numberOfFriends} group slots for ${formatTime(hour)} are already taken. Your group has ${numberOfFriends} people, so only ${numberOfFriends} systems can share the same time. Choose a different time slot.`,
          });
          setTimeout(() => setConflictWarning(null), 6000);
          return;
        }

        const currentSystemState = bookingStates.find((s) => s.systemId === systemId);
        const slotsSelectedInThisSystem = currentSystemState?.slots.filter(
          (slot) => slot.status === "selected"
        ).length || 0;
        if (slotsSelectedInThisSystem >= numberOfHours) {
          setConflictWarning({
            systemId,
            message: `❌ You already selected ${numberOfHours} hour${numberOfHours !== 1 ? "s" : ""} on this system — that's the max per person. To book more hours, select a different system.`,
          });
          setTimeout(() => setConflictWarning(null), 6000);
          return;
        }
      }
    }

    setConflictWarning(null);
    setBookingStates((prev) =>
      prev.map((state) => {
        if (state.systemId !== systemId) return state;
        return {
          ...state,
          slots: state.slots.map((slot) => {
            if (slot.hour !== hour) return slot;
            if (slot.status === "available") return { ...slot, status: "selected" };
            if (slot.status === "selected") return { ...slot, status: "available" };
            return slot;
          }),
        };
      })
    );
  };

  const getSelectedCount = (): number =>
    bookingStates.reduce(
      (total, state) => total + state.slots.filter((slot) => slot.status === "selected").length,
      0
    );

  const getTotalPrice = (): number => getSelectedCount() * pricePerHour;

  const handleProceedToBooking = () => {
    const bookings = bookingStates
      .map((state) => ({
        systemId: state.systemId,
        date: selectedDate,
        timeSlots: state.slots
          .filter((slot) => slot.status === "selected")
          .map((slot) => slot.hour),
      }))
      .filter((booking) => booking.timeSlots.length > 0);
    onBookingComplete(bookings);
  };

  const requiredSlots = partySize === "solo" ? numberOfHours : numberOfFriends * numberOfHours;
  const isRequiredSlotsMet = getSelectedCount() === requiredSlots;

  const systemsToDisplay = isRequiredSlotsMet
    ? bookingStates.filter((state) => state.slots.some((slot) => slot.status === "selected"))
    : bookingStates;

  return (
    <div className="bg-white rounded-xl shadow-md">
      {isRequiredSlotsMet && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-bold text-lg">All Required Time Slots Selected!</p>
              <p className="text-sm opacity-90">Unselect time slots to see other gaming systems</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-0 border-b border-gray-200 overflow-x-auto">
        {next7Days.map((date, index) => {
          const { day, dateNum, month } = formatDateShort(date);
          const isSelected = selectedDate.toDateString() === date.toDateString();
          return (
            <button
              key={date.toDateString()}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 px-6 py-4 flex flex-col items-center justify-center min-w-[90px] transition-all ${
                isSelected ? "bg-red-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              } ${index !== 0 ? "border-l border-gray-200" : ""}`}
            >
              <div className="text-sm font-medium">{day}</div>
              <div className="text-3xl font-bold my-1">{dateNum}</div>
              <div className="text-xs font-medium">{month}</div>
            </button>
          );
        })}
      </div>

      {partySize === "solo" && numberOfHours && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <p className="text-sm text-blue-800 text-center">
            <strong>Playing Solo:</strong> Select {numberOfHours} time slot{numberOfHours !== 1 ? "s" : ""}.
            You cannot select the same time on different systems.
          </p>
        </div>
      )}
      {partySize === "group" && numberOfHours && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <p className="text-sm text-blue-800 text-center mb-2">
            <strong>Group Booking:</strong> {numberOfFriends} people × {numberOfHours} hours each = <strong>{numberOfFriends * numberOfHours} total slots needed</strong>
          </p>
          <div className="flex justify-center gap-6 text-xs text-blue-700">
            <div>✓ Max {numberOfFriends} systems per time slot</div>
            <div>✓ Max {numberOfHours} slots per system</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          {loadingSlots ? "Loading availability..." : (
            <>Showing <span className="font-bold text-purple-600">{systemsToDisplay.length}</span> gaming systems</>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Available</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Booked</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Occupied</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span>Reserved</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span>Repair</span></div>
        </div>
      </div>

      {loadingSlots ? (
        <div className="p-12 text-center text-gray-500">Loading availability...</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {systemsToDisplay.map((bookingState) => {
            const system = getSystemInfo(bookingState.systemId);
            if (!system) return null;
            return (
              <div key={bookingState.systemId} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{system.name}</h3>
                  {system.type === "PC" ? (
                    <div className="text-sm text-gray-600 space-y-1">
                      {system.gpu && <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-gray-500" /><span>{system.gpu}</span></div>}
                      {system.cpu && <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-500" /><span>{system.cpu}</span></div>}
                      {system.ram && <div className="flex items-center gap-2"><MemoryStick className="w-4 h-4 text-gray-500" /><span>{system.ram}</span></div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{system.console}</span>
                      <span> - Console Gaming Station</span>
                    </div>
                  )}
                </div>
                {conflictWarning?.systemId === bookingState.systemId && (
                  <div className="mb-3 bg-red-50 border-2 border-red-400 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
                    {conflictWarning.message}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {bookingState.slots.map((slot) => (
                    <button
                      key={slot.hour}
                      onClick={() =>
                        (slot.status === "available" || slot.status === "selected") &&
                        handleSlotClick(bookingState.systemId, slot.hour)
                      }
                      disabled={slot.status === "booked" || slot.status === "repair" || slot.status === "reserved"}
                      className={`px-6 py-3 rounded-md text-sm font-semibold transition-all min-w-[120px] ${
                        slot.status === "available"
                          ? "border-2 border-green-600 text-green-700 bg-white hover:bg-green-50 cursor-pointer"
                          : slot.status === "selected"
                          ? "border-2 border-green-600 bg-green-600 text-white cursor-pointer"
                          : slot.status === "booked"
                          ? "border-2 border-red-500 bg-red-500 text-white cursor-not-allowed"
                          : slot.status === "walkin"
                          ? "border-2 border-orange-500 bg-orange-500 text-white cursor-not-allowed"
                          : slot.status === "reserved"
                          ? "border-2 border-amber-400 bg-amber-400 text-amber-950 cursor-not-allowed"
                          : "border-2 border-purple-500 bg-purple-500 text-white cursor-not-allowed"
                      }`}
                    >
                      {slot.status === "booked" ? "BOOKED" : slot.status === "repair" ? "REPAIR" : slot.status === "walkin" ? "OCCUPIED" : slot.status === "reserved" ? "RESERVED" : formatTime(slot.hour)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {getSelectedCount() > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <div className="text-sm opacity-90 mb-1">
                {getSelectedCount()} / {requiredSlots} slot{requiredSlots !== 1 ? "s" : ""} selected
                {!isRequiredSlotsMet && (
                  <span className="ml-2 text-yellow-300">(Select {requiredSlots - getSelectedCount()} more)</span>
                )}
              </div>
              <div className="text-3xl font-bold">₹{getTotalPrice()}</div>
              {partySize === "group" && (
                <div className="text-xs opacity-80 mt-1">
                  {numberOfFriends} people × {numberOfHours} hours × ₹{pricePerHour}/hour
                </div>
              )}
            </div>
            <Button
              onClick={handleProceedToBooking}
              disabled={!isRequiredSlotsMet}
              className={`px-10 py-4 text-lg font-bold rounded-lg ${
                !isRequiredSlotsMet
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-white text-purple-600 hover:bg-gray-100"
              }`}
            >
              {!isRequiredSlotsMet
                ? `Select ${requiredSlots - getSelectedCount()} More Slot${requiredSlots - getSelectedCount() !== 1 ? "s" : ""}`
                : "Proceed to Booking"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}