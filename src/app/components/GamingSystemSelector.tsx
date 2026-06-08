import { useState } from "react";
import { GamingSystem } from "../data/mockData";
import { Button } from "./ui/button";
import { AdvancedBookingInterface } from "./AdvancedBookingInterface";

interface GamingSystemSelectorProps {
  systems: GamingSystem[];
  onSelect: (selectedSystems: GamingSystem[]) => void;
  onHoursChange?: (hours: number) => void;
  onDateChange?: (date: Date | null) => void;
  pricePerHour: number;
  operatingHours: { start: number; end: number };
}

export function GamingSystemSelector({
  systems,
  onSelect,
  onHoursChange,
  onDateChange,
  pricePerHour,
  operatingHours
}: GamingSystemSelectorProps) {
  const [partySize, setPartySize] = useState<"solo" | "group" | null>(null);
  const [numberOfFriends, setNumberOfFriends] = useState(1);
  const [numberOfHours, setNumberOfHours] = useState(1);
  const [showHourSelection, setShowHourSelection] = useState(false);
  const [showAdvancedBooking, setShowAdvancedBooking] = useState(false);

  const handleProceedToBooking = () => {
    setShowHourSelection(true);
  };

  const handleHoursSelected = () => {
    setShowAdvancedBooking(true);
  };

  const handleBookingComplete = (bookings: any) => {
    // Extract all selected systems from bookings
    const selectedSystemIds = bookings.map((b: any) => b.systemId);
    const selectedSystems = systems.filter(s => selectedSystemIds.includes(s.id));

    // Calculate total hours
    const totalHours = bookings.reduce((sum: number, b: any) => sum + b.timeSlots.length, 0);

    onSelect(selectedSystems);
    if (onHoursChange) onHoursChange(totalHours);
    if (onDateChange && bookings.length > 0) onDateChange(bookings[0].date);

    // Show booking summary
    const totalPrice = totalHours * pricePerHour;
    alert(`Booking Confirmed!\n\nDate: ${bookings[0]?.date.toLocaleDateString()}\nSystems: ${bookings.length}\nTotal Slots: ${totalHours}\nTotal Price: $${totalPrice}\n\nThank you for your booking!`);
  };

  // Show Advanced Booking Interface after party size and hour selection
  if (showAdvancedBooking) {
    return (
      <div>
        <AdvancedBookingInterface
          systems={systems}
          cafeOperatingHours={operatingHours}
          onBookingComplete={handleBookingComplete}
          pricePerHour={pricePerHour}
          partySize={partySize!}
          numberOfFriends={numberOfFriends}
          numberOfHours={numberOfHours}
        />
      </div>
    );
  }

  // Show Hour Selection for Both Solo and Group Players
  if (showHourSelection && partySize) {
    const totalSlotsNeeded = partySize === "solo" ? numberOfHours : numberOfFriends * numberOfHours;

    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">How Many Hours?</h2>

        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-3">
            {partySize === "solo"
              ? "Select the number of hours you want to play"
              : "Select the number of hours each person will play"
            }
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="12"
              value={numberOfHours}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setNumberOfHours(Math.max(1, Math.min(val, 12)));
              }}
              className="w-24 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNumberOfHours(Math.max(1, numberOfHours - 1))}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold"
              >
                -
              </button>
              <button
                onClick={() => setNumberOfHours(Math.min(12, numberOfHours + 1))}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-600">{numberOfHours === 1 ? "hour" : "hours"} per person</span>
          </div>

          {partySize === "group" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Total slots needed:</strong> {numberOfFriends} people × {numberOfHours} hours = <strong>{totalSlotsNeeded} time slots</strong>
              </p>
              <p className="text-xs text-blue-700 mt-2">
                • You can select the same time on up to {numberOfFriends} systems (for friends playing together)
              </p>
              <p className="text-xs text-blue-700">
                • You can select up to {numberOfHours} slots on each system (hours per person)
              </p>
            </div>
          )}

          {partySize === "solo" && (
            <p className="text-sm text-purple-700 mt-3 font-medium">
              You will select {numberOfHours} time slot{numberOfHours === 1 ? "" : "s"} on the next screen
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowHourSelection(false)}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            onClick={handleHoursSelected}
          >
            Continue to Booking
          </Button>
        </div>
      </div>
    );
  }

  // Party Size Selection Screen
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Select Party Size</h2>

      {/* Party Size Selection */}
      {!partySize && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Are you playing alone or with friends?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setPartySize("solo")}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
            >
              <div className="text-4xl mb-2">🎮</div>
              <div className="font-semibold">Playing Solo</div>
              <div className="text-sm text-gray-600 mt-1">Just me</div>
            </button>
            <button
              onClick={() => setPartySize("group")}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
            >
              <div className="text-4xl mb-2">👥</div>
              <div className="font-semibold">With Friends</div>
              <div className="text-sm text-gray-600 mt-1">Group gaming</div>
            </button>
          </div>
        </div>
      )}

      {/* Number of Friends - only show for group bookings */}
      {partySize === "group" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
          <h3 className="text-lg font-semibold mb-3">How many friends are joining? (including you)</h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="2"
              max={systems.filter(s => !s.bookingStatus.isBooked).length}
              value={numberOfFriends}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 2;
                const newValue = Math.max(2, Math.min(val, systems.filter(s => !s.bookingStatus.isBooked).length));
                setNumberOfFriends(newValue);
              }}
              className="w-24 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newValue = Math.max(2, numberOfFriends - 1);
                  setNumberOfFriends(newValue);
                }}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold"
              >
                -
              </button>
              <button
                onClick={() => {
                  const newValue = Math.min(systems.filter(s => !s.bookingStatus.isBooked).length, numberOfFriends + 1);
                  setNumberOfFriends(newValue);
                }}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-600">people</span>
          </div>
          <p className="text-sm text-purple-700 mt-3 font-medium">
            You will select {numberOfFriends} gaming systems on the next screen
          </p>
        </div>
      )}

      {/* Proceed to booking button - only show after party size is chosen */}
      {partySize && (
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          onClick={handleProceedToBooking}
        >
          Continue to Booking
        </Button>
      )}
    </div>
  );
}
