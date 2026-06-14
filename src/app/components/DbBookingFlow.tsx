import { useState } from "react";
import { useNavigate } from "react-router";
import { Monitor, Cpu, MemoryStick, Gamepad2 } from "lucide-react";
import { Button } from "./ui/button";

interface DbGamingSystem {
  id: string;
  cafe_id: string;
  name: string;
  type: string;
  gpu: string | null;
  cpu: string | null;
  ram: string | null;
  console: string | null;
}

interface DbBookingFlowProps {
  systems: DbGamingSystem[];
  cafeName: string;
  cafeId: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
}

export function DbBookingFlow({
  systems,
  cafeName,
  pricePerHour,
  openingTime,
  closingTime,
}: DbBookingFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"party" | "system" | "datetime" | "review">("party");
  const [partySize, setPartySize] = useState<"solo" | "group" | null>(null);
  const [numberOfFriends, setNumberOfFriends] = useState(2);
  const [selectedSystems, setSelectedSystems] = useState<DbGamingSystem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [numberOfHours, setNumberOfHours] = useState(1);

  // Generate next 7 days
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  // Generate available hours from opening/closing time
  const getAvailableHours = () => {
    const parseHour = (time: string) => parseInt(time.split(":")[0], 10);
    const start = openingTime ? parseHour(openingTime) : 8;
    const end = closingTime ? parseHour(closingTime) : 22;
    const hours: number[] = [];
    for (let h = start; h < end; h++) hours.push(h);
    return hours;
  };

  const availableHours = getAvailableHours();

  const formatHour = (hour: number) => {
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${suffix}`;
  };

  const formatDateShort = (date: Date) => ({
    day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    dateNum: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  });

  const playerCount = partySize === "solo" ? 1 : numberOfFriends;
  const totalPrice = playerCount * numberOfHours * pricePerHour;

  const toggleSystem = (system: DbGamingSystem) => {
    const needed = partySize === "solo" ? 1 : numberOfFriends;
    if (selectedSystems.find((s) => s.id === system.id)) {
      setSelectedSystems((prev) => prev.filter((s) => s.id !== system.id));
    } else if (selectedSystems.length < needed) {
      setSelectedSystems((prev) => [...prev, system]);
    }
  };

  const handleProceedToConfirm = () => {
    if (!selectedDate || startHour === null) return;

    // Build bookings array compatible with BookingConfirm
    const timeSlots = Array.from({ length: numberOfHours }, (_, i) => startHour + i);
    const bookings = selectedSystems.map((system) => ({
      systemId: system.id,
      date: selectedDate,
      timeSlots,
    }));

    // Build systems array compatible with BookingConfirm (getSystemName lookup)
    const systemsForConfirm = selectedSystems.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    navigate("/booking/confirm", {
      state: {
        bookings,
        systems: systemsForConfirm,
        partySize,
        numberOfFriends,
        numberOfHours,
        pricePerHour,
        totalPrice,
        cafeName,
      },
    });
  };

  // Step 1: Party size
  if (step === "party") {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Select Party Size</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => { setPartySize("solo"); setStep("system"); }}
            className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <div className="text-4xl mb-2">🎮</div>
            <div className="font-semibold">Playing Solo</div>
            <div className="text-sm text-gray-600 mt-1">Just me</div>
          </button>
          <button
            onClick={() => { setPartySize("group"); setStep("system"); }}
            className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <div className="text-4xl mb-2">👥</div>
            <div className="font-semibold">With Friends</div>
            <div className="text-sm text-gray-600 mt-1">Group gaming</div>
          </button>
        </div>

        {partySize === "group" && (
          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200 mb-4">
            <h3 className="font-semibold mb-3">How many people? (including you)</h3>
            <div className="flex items-center gap-4">
              <button onClick={() => setNumberOfFriends(Math.max(2, numberOfFriends - 1))}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">-</button>
              <span className="text-2xl font-bold w-8 text-center">{numberOfFriends}</span>
              <button onClick={() => setNumberOfFriends(Math.min(systems.length, numberOfFriends + 1))}
                className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">+</button>
              <span className="text-sm text-gray-600">people</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Select systems
  if (step === "system") {
    const needed = partySize === "solo" ? 1 : numberOfFriends;
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2">Select Gaming System{needed > 1 ? "s" : ""}</h2>
        <p className="text-gray-500 mb-6">
          Choose {needed} system{needed > 1 ? "s" : ""} ({selectedSystems.length}/{needed} selected)
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {systems.map((system) => {
            const isSelected = !!selectedSystems.find((s) => s.id === system.id);
            const isDisabled = !isSelected && selectedSystems.length >= needed;
            return (
              <button
                key={system.id}
                onClick={() => toggleSystem(system)}
                disabled={isDisabled}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-50"
                    : isDisabled
                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {system.type === "PC" ? <Monitor className="w-5 h-5 text-purple-600" /> : <Gamepad2 className="w-5 h-5 text-purple-600" />}
                  <span className="font-semibold">{system.name}</span>
                  {isSelected && <span className="ml-auto text-purple-600 font-bold">✓</span>}
                </div>
                {system.type === "PC" ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    {system.gpu && <div className="flex items-center gap-1"><Monitor className="w-3 h-3" />{system.gpu}</div>}
                    {system.cpu && <div className="flex items-center gap-1"><Cpu className="w-3 h-3" />{system.cpu}</div>}
                    {system.ram && <div className="flex items-center gap-1"><MemoryStick className="w-3 h-3" />{system.ram}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">{system.console} Console</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setStep("party"); setSelectedSystems([]); }}>Back</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={selectedSystems.length < needed}
            onClick={() => setStep("datetime")}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Date & time
  if (step === "datetime") {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Pick Date & Time</h2>

        {/* Date picker */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Date</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {next7Days.map((date) => {
              const { day, dateNum, month } = formatDateShort(date);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={date.toDateString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl flex flex-col items-center min-w-[70px] border-2 transition-all ${
                    isSelected ? "border-purple-500 bg-purple-600 text-white" : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-2xl font-bold">{dateNum}</span>
                  <span className="text-xs">{month}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start time */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Start Time</p>
          <div className="flex flex-wrap gap-2">
            {availableHours.map((hour) => (
              <button
                key={hour}
                onClick={() => setStartHour(hour)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  startHour === hour
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                {formatHour(hour)}
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Number of Hours</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setNumberOfHours(Math.max(1, numberOfHours - 1))}
              className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">-</button>
            <span className="text-2xl font-bold w-8 text-center">{numberOfHours}</span>
            <button onClick={() => setNumberOfHours(Math.min(8, numberOfHours + 1))}
              className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">+</button>
            <span className="text-sm text-gray-600">hour{numberOfHours > 1 ? "s" : ""}</span>
          </div>
          {startHour !== null && (
            <p className="text-sm text-purple-700 mt-2">
              Session: {formatHour(startHour)} → {formatHour(startHour + numberOfHours)}
            </p>
          )}
        </div>

        {/* Price preview */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border-2 border-purple-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{playerCount} player{playerCount > 1 ? "s" : ""} × {numberOfHours} hr × ${pricePerHour}/hr</span>
            <span className="text-2xl font-bold text-purple-600">${totalPrice}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep("system")}>Back</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={!selectedDate || startHour === null}
            onClick={handleProceedToConfirm}
          >
            Review & Confirm
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
