import { useState, useEffect } from "react";
import { Monitor, Cpu, MemoryStick } from "lucide-react";
import { GamingSystem } from "../data/mockData";
import { Button } from "./ui/button";

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
  status: "available" | "booked" | "repair" | "selected";
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
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Generate next 7 days
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Generate time slots based on operating hours
  const generateTimeSlots = (): number[] => {
    const slots: number[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();

    for (let hour = cafeOperatingHours.start; hour <= cafeOperatingHours.end; hour++) {
      if (isToday && hour <= currentHour) {
        continue;
      }
      slots.push(hour);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Initialize booking states for all systems
  useEffect(() => {
    const initialStates: SystemBookingState[] = systems.map((system) => {
      const slots: TimeSlotState[] = timeSlots.map((hour) => {
        const systemSlot = system.timeSlots.find((s) => s.hour === hour);
        const isRepair = Math.random() < 0.05;

        let status: TimeSlotState["status"] = "available";
        if (isRepair) {
          status = "repair";
        } else if (systemSlot?.isBooked) {
          status = "booked";
        }

        return { hour, status };
      });

      return { systemId: system.id, slots };
    });

    setBookingStates(initialStates);
  }, [selectedDate, systems]);

  const handleSlotClick = (systemId: string, hour: number) => {
    // Check if we're trying to select (not deselect)
    const currentSlot = bookingStates
      .find((s) => s.systemId === systemId)
      ?.slots.find((slot) => slot.hour === hour);

    const isSelecting = currentSlot?.status === "available";

    if (isSelecting) {
      // For solo players, check if this time slot is already selected in another system
      if (partySize === "solo") {
        const isTimeSlotUsedElsewhere = bookingStates.some(
          (state) =>
            state.systemId !== systemId &&
            state.slots.some((slot) => slot.hour === hour && slot.status === "selected")
        );

        if (isTimeSlotUsedElsewhere) {
          // Show warning
          setConflictWarning("⚠️ You cannot select the same time slot on different systems. You can only use one PC at a time!");
          // Auto-hide warning after 4 seconds
          setTimeout(() => setConflictWarning(null), 4000);
          return;
        }
      }

      // For group players, check constraints
      if (partySize === "group") {
        // Constraint 1: Can select at most numberOfFriends of the same time slot across different systems
        const timeSlotsUsedForThisHour = bookingStates.filter(
          (state) => state.slots.some((slot) => slot.hour === hour && slot.status === "selected")
        ).length;

        if (timeSlotsUsedForThisHour >= numberOfFriends) {
          setConflictWarning(`⚠️ You can select at most ${numberOfFriends} systems for the same time slot (because you have ${numberOfFriends} people in your group)!`);
          setTimeout(() => setConflictWarning(null), 4000);
          return;
        }

        // Constraint 2: Can select at most numberOfHours slots in a single system
        const currentSystemState = bookingStates.find((s) => s.systemId === systemId);
        const slotsSelectedInThisSystem = currentSystemState?.slots.filter(
          (slot) => slot.status === "selected"
        ).length || 0;

        if (slotsSelectedInThisSystem >= numberOfHours) {
          setConflictWarning(`⚠️ You can select at most ${numberOfHours} time slot${numberOfHours !== 1 ? "s" : ""} on each system (hours per person)!`);
          setTimeout(() => setConflictWarning(null), 4000);
          return;
        }
      }
    }

    // Clear warning if any
    setConflictWarning(null);

    setBookingStates((prev) =>
      prev.map((state) => {
        if (state.systemId !== systemId) return state;

        return {
          ...state,
          slots: state.slots.map((slot) => {
            if (slot.hour !== hour) return slot;

            if (slot.status === "available") {
              return { ...slot, status: "selected" };
            } else if (slot.status === "selected") {
              return { ...slot, status: "available" };
            }
            return slot;
          }),
        };
      })
    );
  };

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

  const getSelectedCount = (): number => {
    return bookingStates.reduce(
      (total, state) =>
        total + state.slots.filter((slot) => slot.status === "selected").length,
      0
    );
  };

  const getTotalPrice = (): number => {
    return getSelectedCount() * pricePerHour;
  };

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

  const getSystemInfo = (systemId: string) => {
    return systems.find((s) => s.id === systemId);
  };

  const requiredSlots = partySize === "solo" ? numberOfHours : numberOfFriends * numberOfHours;
  const isRequiredSlotsMet = getSelectedCount() === requiredSlots;

  // Filter systems to show only those with selected slots when requirements are met
  const systemsToDisplay = isRequiredSlotsMet
    ? bookingStates.filter((state) =>
        state.slots.some((slot) => slot.status === "selected")
      )
    : bookingStates;

  return (
    <div className="bg-white rounded-xl shadow-md">
      {/* Conflict Warning */}
      {conflictWarning && (
        <div className="bg-red-500 text-white px-6 py-4 font-semibold text-center">
          {conflictWarning}
        </div>
      )}

      {/* Tip Banner - Show when all required slots are selected */}
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

      {/* Date Selector - Matching movie booking design */}
      <div className="flex items-center gap-0 border-b border-gray-200 overflow-x-auto">
        {next7Days.map((date, index) => {
          const { day, dateNum, month } = formatDateShort(date);
          const isSelected = selectedDate.toDateString() === date.toDateString();

          return (
            <button
              key={date.toDateString()}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 px-6 py-4 flex flex-col items-center justify-center min-w-[90px] transition-all ${
                isSelected
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } ${index !== 0 ? "border-l border-gray-200" : ""}`}
            >
              <div className="text-sm font-medium">{day}</div>
              <div className="text-3xl font-bold my-1">{dateNum}</div>
              <div className="text-xs font-medium">{month}</div>
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      {partySize === "solo" && numberOfHours && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <p className="text-sm text-blue-800 text-center">
            <strong>Playing Solo:</strong> Select {numberOfHours} time slot{numberOfHours !== 1 ? "s" : ""} across different systems.
            You cannot select the same time on different PCs (you can only use one PC at a time).
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

      {/* Legend and System Count */}
      <div className="flex justify-between items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        {isRequiredSlotsMet && (
          <div className="text-sm text-gray-600">
            Showing <span className="font-bold text-purple-600">{systemsToDisplay.length}</span> of {bookingStates.length} systems with selected slots
          </div>
        )}
        {!isRequiredSlotsMet && (
          <div className="text-sm text-gray-600">
            Showing <span className="font-bold text-purple-600">{bookingStates.length}</span> gaming systems
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span className="text-gray-700 font-medium">AVAILABLE</span>
        </div>
      </div>

      {/* Systems List */}
      <div className="divide-y divide-gray-200">
        {systemsToDisplay.map((bookingState) => {
          const system = getSystemInfo(bookingState.systemId);
          if (!system) return null;

          return (
            <div key={bookingState.systemId} className="p-6 hover:bg-gray-50 transition-colors">
              {/* System Info */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{system.name}</h3>
                {system.type === "PC" ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-gray-500" />
                      <span>{system.gpu}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-gray-500" />
                      <span>{system.cpu}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MemoryStick className="w-4 h-4 text-gray-500" />
                      <span>{system.ram}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">{system.console}</span>
                    <span> - Console Gaming Station</span>
                  </div>
                )}
              </div>

              {/* Time Slots - Matching movie booking design */}
              <div className="flex flex-wrap gap-3">
                {bookingState.slots.map((slot) => (
                  <button
                    key={slot.hour}
                    onClick={() =>
                      (slot.status === "available" || slot.status === "selected") &&
                      handleSlotClick(bookingState.systemId, slot.hour)
                    }
                    disabled={slot.status === "booked" || slot.status === "repair"}
                    className={`px-6 py-3 rounded-md text-sm font-semibold transition-all min-w-[120px] ${
                      slot.status === "available"
                        ? "border-2 border-green-600 text-green-700 bg-white hover:bg-green-50 cursor-pointer"
                        : slot.status === "selected"
                        ? "border-2 border-green-600 bg-green-600 text-white cursor-pointer"
                        : slot.status === "booked"
                        ? "border-2 border-red-500 bg-red-500 text-white cursor-not-allowed"
                        : "border-2 border-purple-500 bg-purple-500 text-white cursor-not-allowed"
                    }`}
                  >
                    {slot.status === "booked"
                      ? "BOOKED"
                      : slot.status === "repair"
                      ? "REPAIR"
                      : formatTime(slot.hour)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with Booking Summary */}
      {getSelectedCount() > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <div className="text-sm opacity-90 mb-1">
                {getSelectedCount()} / {requiredSlots} slot{requiredSlots !== 1 ? "s" : ""} selected
                {!isRequiredSlotsMet && (
                  <span className="ml-2 text-yellow-300">
                    (Select {requiredSlots - getSelectedCount()} more)
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold">${getTotalPrice()}</div>
              {partySize === "group" && (
                <div className="text-xs opacity-80 mt-1">
                  {numberOfFriends} people × {numberOfHours} hours × ${pricePerHour}/hour
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
