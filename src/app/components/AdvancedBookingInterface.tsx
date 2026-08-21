import { useState, useEffect, Fragment, useMemo } from "react";
import { Monitor, Cpu, MemoryStick, Gamepad2, SlidersHorizontal } from "lucide-react";
import { GamingSystem } from "../types";
import { Button } from "./ui/button";
import { supabase } from "../../supabase";
import { toLocalDateString } from "../utils/date";
import { findHourGaps } from "../utils/cafeHours";
import { effectiveSystemPrice } from "../utils/pricing";
import { ClosedSlotMarker } from "./ClosedSlotMarker";

interface AdvancedBookingInterfaceProps {
  systems: GamingSystem[];
  // Bookable full-hour slot starts for the shown day, already resolved from the cafe's
  // cafe_hours (handles midnight-crossing schedules via the calendar-day model). In the
  // MVP every calendar day has the same set, so a single array is applied to all 7 days.
  hoursOfDay: number[];
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
  hoursOfDay,
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
  const [typeFilter, setTypeFilter] = useState<"all" | "PC" | "Console">("all");
  const [availFilter, setAvailFilter] = useState<"all" | "free">("all");

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const generateTimeSlots = (): number[] => {
    const slots: number[] = [];
    const now = new Date();
    for (const hour of [...hoursOfDay].sort((a, b) => a - b)) {
      // Compare the slot's actual start instant rather than just its hour number.
      // Besides hiding today's past hours, this also covers the case where the tab
      // has been left open past midnight: `selectedDate` is then a *past* day, and
      // every one of its slots is correctly hidden instead of becoming bookable.
      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, 0, 0, 0);
      if (slotStart.getTime() <= now.getTime()) continue;
      slots.push(hour);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const slotGaps = findHourGaps(timeSlots);
  const gapAfterHour = new Map(slotGaps.map(g => [g.afterHour, g]));

  useEffect(() => {
    // Guards against out-of-order responses: switching days quickly fires several
    // fetches, and a slow reply for an earlier day must not overwrite the grid
    // that is now showing a different day.
    let cancelled = false;

    const fetchBookedSlots = async () => {
      setLoadingSlots(true);
      const dateStr = toLocalDateString(selectedDate);
      const systemIds = systems.map((s) => s.id);

      // Read availability through a SECURITY DEFINER RPC that returns ONLY
      // occupancy (system_id + start/end), never customer PII. This lets us lock
      // the bookings table down with RLS while public visitors can still see which
      // slots are taken. Same return shape as the old table query.
      const { data: bookings } = await supabase.rpc("get_booked_slots", {
        p_system_ids: systemIds,
        p_date: dateStr,
      });

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
      if (cancelled) return; // a newer day was selected while this was in flight
      setBookingStates(newStates);
      setLoadingSlots(false);
    };

    if (systems.length > 0) fetchBookedSlots();
    return () => { cancelled = true; };
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

  // Sum per system: each system's selected slots priced at its effective rate
  // (its own price, or the cafe default when unset). Mixed-price selections total
  // correctly instead of using one flat rate.
  const getTotalPrice = (): number =>
    bookingStates.reduce((total, state) => {
      const sys = getSystemInfo(state.systemId);
      const rate = effectiveSystemPrice(sys?.pricePerHour, pricePerHour);
      const selected = state.slots.filter((slot) => slot.status === "selected").length;
      return total + selected * rate;
    }, 0);

  // Do all shown systems share one effective price? Drives whether the group
  // summary can show a single "× ₹rate" line or must say "priced per system".
  const distinctPrices = new Set(
    systems.map((s) => effectiveSystemPrice(s.pricePerHour, pricePerHour))
  );
  const uniformRate =
    distinctPrices.size === 1 ? [...distinctPrices][0] : pricePerHour;

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

  const systemsToDisplay = useMemo(() => {
    let filtered = isRequiredSlotsMet
      ? bookingStates.filter((state) => state.slots.some((slot) => slot.status === "selected"))
      : bookingStates;
    if (typeFilter !== "all") {
      filtered = filtered.filter((state) => {
        const sys = getSystemInfo(state.systemId);
        return sys?.type === typeFilter;
      });
    }
    if (availFilter === "free") {
      filtered = filtered.filter((state) =>
        state.slots.some((slot) => slot.status === "available")
      );
    }
    return filtered;
  }, [bookingStates, isRequiredSlotsMet, typeFilter, availFilter]);

  return (
    <div className="bg-white rounded-xl shadow-md">
      {isRequiredSlotsMet && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-4 text-center shadow-lg">
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
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex flex-col items-center justify-center min-w-[72px] sm:min-w-[90px] transition-all ${
                isSelected ? "bg-red-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              } ${index !== 0 ? "border-l border-gray-200" : ""}`}
            >
              <div className="text-sm font-medium">{day}</div>
              <div className="text-2xl sm:text-3xl font-bold my-1">{dateNum}</div>
              <div className="text-xs font-medium">{month}</div>
            </button>
          );
        })}
      </div>

      {partySize === "solo" && numberOfHours && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-3">
          <p className="text-sm text-blue-800 text-center">
            <strong>Playing Solo:</strong> Select {numberOfHours} time slot{numberOfHours !== 1 ? "s" : ""}.
            You cannot select the same time on different systems.
          </p>
        </div>
      )}
      {partySize === "group" && numberOfHours && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-4">
          <p className="text-sm text-blue-800 text-center mb-2">
            <strong>Group Booking:</strong> {numberOfFriends} people × {numberOfHours} hours each = <strong>{numberOfFriends * numberOfHours} total slots needed</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-blue-700">
            <div>✓ Max {numberOfFriends} systems per time slot</div>
            <div>✓ Max {numberOfHours} slots per system</div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
          <div className="text-sm text-gray-600">
            {loadingSlots ? "Loading availability..." : (
              <>Showing <span className="font-bold text-blue-600">{systemsToDisplay.length}</span> of {bookingStates.length} systems</>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Available</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Booked</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Occupied</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span>Reserved</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>Repair</span></div>
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          {([["all", "All Systems"], ["PC", "🖥️ PC"], ["Console", "🎮 Console"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTypeFilter(val)}
              className={`filter-chip px-3 py-1 rounded-full text-xs font-medium transition-all ${
                typeFilter === val
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-300 mx-1" />
          {([["all", "All Slots"], ["free", "✅ Has Free Slots"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setAvailFilter(val)}
              className={`filter-chip px-3 py-1 rounded-full text-xs font-medium transition-all ${
                availFilter === val
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
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
              <div key={bookingState.systemId} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="mb-4">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{system.name}</h3>
                    <span className="inline-flex items-baseline gap-0.5 text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      ₹{effectiveSystemPrice(system.pricePerHour, pricePerHour)}
                      <span className="text-xs font-normal text-blue-400">/hr</span>
                    </span>
                  </div>
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
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {bookingState.slots.map((slot) => {
                    const gap = gapAfterHour.get(slot.hour);
                    return (
                    <Fragment key={slot.hour}>
                    <button
                      onClick={() =>
                        (slot.status === "available" || slot.status === "selected") &&
                        handleSlotClick(bookingState.systemId, slot.hour)
                      }
                      disabled={slot.status === "booked" || slot.status === "repair" || slot.status === "reserved"}
                      className={`px-4 sm:px-6 py-3 rounded-md text-sm font-semibold transition-all min-w-[92px] sm:min-w-[120px] ${
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
                          : "border-2 border-blue-500 bg-blue-500 text-white cursor-not-allowed"
                      }`}
                    >
                      {slot.status === "booked" ? "BOOKED" : slot.status === "repair" ? "REPAIR" : slot.status === "walkin" ? "OCCUPIED" : slot.status === "reserved" ? "RESERVED" : formatTime(slot.hour)}
                    </button>
                    {gap && <ClosedSlotMarker from={gap.from} to={gap.to} size="lg" />}
                    </Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {getSelectedCount() > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-blue-600 to-cyan-400 text-white p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
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
                  {distinctPrices.size === 1
                    ? `${numberOfFriends} people × ${numberOfHours} hours × ₹${uniformRate}/hour`
                    : "Priced per system — total reflects each machine's rate"}
                </div>
              )}
            </div>
            <Button
              onClick={handleProceedToBooking}
              disabled={!isRequiredSlotsMet}
              className={`w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-lg ${
                !isRequiredSlotsMet
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-white text-blue-600 hover:bg-gray-100"
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