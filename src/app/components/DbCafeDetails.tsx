import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import { MapPin, Clock, Phone, Mail, ArrowLeft, Star, Coffee, Gamepad2 } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "../../supabase";
import { SteamGameImage } from "./SteamGameImage";
import { hoursForUniformSchedule, CafeHoursSchedule } from "../utils/cafeHours";
import { effectiveSystemPrice, minSystemPrice, maxSystemPrice } from "../utils/pricing";
import { AdvancedBookingInterface } from "./AdvancedBookingInterface";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { DbReviewsSection } from "./DbReviewsSection";

interface DbCafe {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  price_per_hour: number;
  image_url: string | null;
  gallery_images: string[];
  is_approved: boolean;
  amenities: string[];
  games: string[];
}

interface DbGamingSystem {
  id: string;
  cafe_id: string;
  name: string;
  type: string;
  gpu: string | null;
  cpu: string | null;
  ram: string | null;
  console: string | null;
  price_per_hour: number | null;
}

export function DbCafeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingRef = useRef<HTMLDivElement>(null);

  const [cafe, setCafe] = useState<DbCafe | null>(null);
  const [hoursRow, setHoursRow] = useState<CafeHoursSchedule | null>(null);
  const [systems, setSystems] = useState<DbGamingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [partySize, setPartySize] = useState<"solo" | "group" | null>(null);
  const [numberOfFriends, setNumberOfFriends] = useState(2);
  const [numberOfHours, setNumberOfHours] = useState(1);
  const [showHourSelection, setShowHourSelection] = useState(false);
  const [showAdvancedBooking, setShowAdvancedBooking] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCafe = async () => {
      const { data, error } = await supabase
        .from("cafes")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setCafe(data as DbCafe);
        const [{ data: systemsData }, { data: hoursData }] = await Promise.all([
          supabase
            .from("gaming_systems")
            .select("id, cafe_id, name, type, gpu, cpu, ram, console, price_per_hour")
            .eq("cafe_id", id),
          // MVP: all 7 day rows are identical, so any one row defines the schedule.
          supabase
            .from("cafe_hours")
            .select("open_time, close_time")
            .eq("cafe_id", id)
            .limit(1)
            .maybeSingle(),
        ]);
        if (systemsData) setSystems(systemsData as DbGamingSystem[]);
        setHoursRow((hoursData as CafeHoursSchedule) ?? null);
      }
      setLoading(false);
    };
    if (id) fetchCafe();
  }, [id]);

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
  };


  // Convert DB systems to the shape AdvancedBookingInterface expects.
  // Memoised: this array is a dependency of the availability fetch inside
  // AdvancedBookingInterface, so rebuilding it on every render re-fired that
  // fetch constantly and reset the grid — wiping the customer's slot selections.
  const convertedSystems = useMemo(
    () =>
      systems.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type as "PC" | "Console",
        gpu: s.gpu || undefined,
        cpu: s.cpu || undefined,
        ram: s.ram || undefined,
        console: s.console || undefined,
        monitor: undefined,
        storage: undefined,
        pricePerHour: s.price_per_hour,
      })),
    [systems]
  );

  // Lowest effective price across this cafe's systems, for the "from ₹X" header.
  const fromPrice = minSystemPrice(
    systems.map((s) => s.price_per_hour),
    cafe?.price_per_hour ?? 0
  );
  const toPrice = maxSystemPrice(
    systems.map((s) => s.price_per_hour),
    cafe?.price_per_hour ?? 0
  );
  // More than one distinct price → show the "₹low – ₹high" range instead of a single value.
  const pricesVary =
    new Set(
      systems.map((s) => effectiveSystemPrice(s.price_per_hour, cafe?.price_per_hour ?? 0))
    ).size > 1;

  // Bookable full-hour slot starts, resolved from cafe_hours via the calendar-day model
  // (handles midnight-crossing schedules). Falls back to a sane default while the
  // cafe_hours row loads (or if none exists yet). See src/app/utils/cafeHours.ts.
  const displaySchedule: CafeHoursSchedule =
    hoursRow ?? { open_time: "08:00", close_time: "22:00" };
  const hoursOfDay = hoursForUniformSchedule(displaySchedule);

  const handleBookNow = () => {
    if (!user) {
      navigate("/login", { state: { returnTo: `/cafe/db/${id}` } });
      return;
    }
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

const handleBookingComplete = (bookings: any) => {
    const selectedSystemIds = bookings.map((b: any) => b.systemId);
    const selectedSystems = convertedSystems.filter((s) => selectedSystemIds.includes(s.id));
    // Total is summed per system — each booking's hours are priced at that system's
    // effective rate (its own price, or the cafe default when unset).
    const totalPrice = bookings.reduce((sum: number, b: any) => {
      const sys = convertedSystems.find((s) => s.id === b.systemId);
      return sum + b.timeSlots.length * effectiveSystemPrice(sys?.pricePerHour, cafe?.price_per_hour || 0);
    }, 0);

    // Inject cafeId into each booking object
    const bookingsWithCafe = bookings.map((b: any) => ({
      ...b,
      cafeId: cafe?.id,
    }));

    navigate("/booking/confirm", {
      state: {
        bookings: bookingsWithCafe,
        systems: selectedSystems,
        partySize,
        numberOfFriends,
        numberOfHours,
        pricePerHour: cafe?.price_per_hour,
        totalPrice,
        cafeName: cafe?.name,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="skeleton h-9 w-20 rounded-lg" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="skeleton rounded-xl aspect-[16/6]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!cafe || !cafe.is_approved) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Cafe not found</h2>
        <Link to="/"><Button>Back to Browse</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/"><Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
      </div>

      {/* Cover Image */}
      <div className="animate-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8" style={{"--stagger": 0} as React.CSSProperties}>
        <div className="rounded-xl overflow-hidden aspect-[16/6] bg-gray-100">
          {cafe.image_url ? (
            <img src={cafe.image_url} alt={cafe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {cafe.gallery_images?.length > 0 && (
        <div className="animate-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8" style={{"--stagger": 0.5} as React.CSSProperties}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {cafe.gallery_images.map((url: string, i: number) => (
              <div key={i} className="rounded-lg overflow-hidden aspect-video bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity">
                <img src={url} alt={`${cafe.name} gallery ${i + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Header */}
        <div className="animate-in bg-white rounded-xl shadow-md p-6 mb-6" style={{"--stagger": 1} as React.CSSProperties}>
          <h1 className="text-3xl font-bold mb-2">{cafe.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-600">
            <div className="flex items-center gap-1"><MapPin className="w-5 h-5" /><span>{cafe.address}, {cafe.city}</span></div>
            {displaySchedule.open_time && displaySchedule.close_time && (
              <div className="flex items-center gap-1"><Clock className="w-5 h-5" /><span>{formatTime(displaySchedule.open_time)} - {formatTime(displaySchedule.close_time)}</span></div>
            )}
          </div>

          {/* Booking box */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-blue-600">
                    ₹{fromPrice}{pricesVary ? ` – ₹${toPrice}` : ""}
                  </span>
                  <span className="text-gray-600">per hour</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Gamepad2 className="w-5 h-5 text-blue-600" />
                <div><p className="text-sm text-gray-500">Gaming Systems</p><p className="font-medium">{systems.length} systems</p></div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-blue-600" />
                <div><p className="text-sm text-gray-500">Hours</p><p className="font-medium">{formatTime(displaySchedule.open_time)} - {formatTime(displaySchedule.close_time)}</p></div>
              </div>
              <div className="flex items-center">
                <Button onClick={handleBookNow} className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700 h-12 text-lg font-semibold">
                  Book Now
                </Button>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600">You won't be charged yet</p>
          </div>

          {cafe.description && <p className="text-gray-700 leading-relaxed mb-4">{cafe.description}</p>}

          {(cafe.phone || cafe.email) && (
            <div className="flex flex-wrap gap-4 text-gray-600 pt-4 border-t border-gray-100">
              {cafe.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{cafe.phone}</span></div>}
              {cafe.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>{cafe.email}</span></div>}
            </div>
          )}
        </div>

        {/* Available Games */}
        {cafe.games && cafe.games.length > 0 && (
          <div className="animate-in bg-white rounded-xl shadow-md p-6 mb-6" style={{"--stagger": 2} as React.CSSProperties}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Gamepad2 className="w-6 h-6" />Available Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cafe.games.map((game) => (
                <div key={game} className="game-card flex flex-col overflow-hidden rounded-lg border-2 border-gray-200">
                  <div className="w-full h-24 overflow-hidden bg-gray-100 flex items-center justify-center">
  <SteamGameImage game={game} />
</div>
                  <div className="p-2 bg-white"><span className="text-sm font-medium">{game}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Flow */}
        <div ref={bookingRef} className="animate-in mb-6" style={{"--stagger": 3} as React.CSSProperties}>
          {systems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-500">No gaming systems listed yet.</div>
          ) : showAdvancedBooking ? (
            <AdvancedBookingInterface
              systems={convertedSystems}
              hoursOfDay={hoursOfDay}
              onBookingComplete={handleBookingComplete}
              pricePerHour={cafe.price_per_hour}
              partySize={partySize!}
              numberOfFriends={numberOfFriends}
              numberOfHours={numberOfHours}
            />
          ) : showHourSelection ? (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">How Many Hours?</h2>
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-semibold mb-3">
                  {partySize === "solo" ? "Select hours you want to play" : "Hours each person will play"}
                </h3>
                <div className="flex items-center gap-4">
                  <input type="number" min="1" max="12" value={numberOfHours}
                    onChange={(e) => setNumberOfHours(Math.max(1, Math.min(parseInt(e.target.value) || 1, 12)))}
                    className="w-24 px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => setNumberOfHours(Math.max(1, numberOfHours - 1))} className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 font-semibold">-</button>
                    <button onClick={() => setNumberOfHours(Math.min(12, numberOfHours + 1))} className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 font-semibold">+</button>
                  </div>
                  <span className="text-sm text-gray-600">{numberOfHours === 1 ? "hour" : "hours"} per person</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowHourSelection(false); setPartySize(null); }}>Back</Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700"
                  onClick={() => setShowAdvancedBooking(true)}>Continue to Booking</Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">Select Party Size</h2>
              {!partySize ? (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { if (!user) { navigate("/login", { state: { returnTo: `/cafe/db/${id}` } }); return; } setPartySize("solo"); setShowHourSelection(true); }} className="party-card p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="font-semibold">Playing Solo</div>
                    <div className="text-sm text-gray-600 mt-1">Just me</div>
                  </button>
                  <button onClick={() => { if (!user) { navigate("/login", { state: { returnTo: `/cafe/db/${id}` } }); return; } setPartySize("group"); }} className="party-card p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50">
                    <div className="text-4xl mb-2">👥</div>
                    <div className="font-semibold">With Friends</div>
                    <div className="text-sm text-gray-600 mt-1">Group gaming</div>
                  </button>
                </div>
              ) : partySize === "group" ? (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-3">How many friends? (including you)</h3>
                  <div className="flex items-center gap-4">
                    <input type="number" min="2" max={systems.length} value={numberOfFriends}
                      onChange={(e) => setNumberOfFriends(Math.max(2, Math.min(parseInt(e.target.value) || 2, systems.length)))}
                      className="w-24 px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg" />
                    <div className="flex gap-2">
                      <button onClick={() => setNumberOfFriends(Math.max(2, numberOfFriends - 1))} className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 font-semibold">-</button>
                      <button onClick={() => setNumberOfFriends(Math.min(systems.length, numberOfFriends + 1))} className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 font-semibold">+</button>
                    </div>
                    <span className="text-sm text-gray-600">people</span>
                  </div>
                </div>
              ) : null}
              {partySize && (
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700"
                  onClick={() => setShowHourSelection(true)}>Continue to Booking</Button>
              )}
            </div>
          )}
        </div>

        {/* Amenities */}
        {cafe.amenities && cafe.amenities.length > 0 && (
          <div className="animate-in bg-white rounded-xl shadow-md p-6 mb-6" style={{"--stagger": 4} as React.CSSProperties}>
            <h2 className="text-xl font-bold mb-4">Amenities</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {cafe.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="animate-in" style={{"--stagger": 5} as React.CSSProperties}>
          <DbReviewsSection cafeId={cafe.id} cafeName={cafe.name} />
        </div>
      </div>
    </div>
  );
}
