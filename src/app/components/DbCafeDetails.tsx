import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import { MapPin, Clock, Phone, Mail, ArrowLeft, Star, Coffee, Gamepad2 } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "../../supabase";
import { gameImages } from "../data/mockData";
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
  opening_time: string;
  closing_time: string;
  image_url: string | null;
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
}

export function DbCafeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingRef = useRef<HTMLDivElement>(null);

  const [cafe, setCafe] = useState<DbCafe | null>(null);
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
        const { data: systemsData } = await supabase
          .from("gaming_systems")
          .select("id, cafe_id, name, type, gpu, cpu, ram, console")
          .eq("cafe_id", id);
        if (systemsData) setSystems(systemsData as DbGamingSystem[]);
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

  const parseHour = (time: string) => parseInt(time?.split(":")[0] || "8", 10);

  // Convert DB systems to the shape AdvancedBookingInterface expects
  const convertedSystems = systems.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type as "PC" | "Console",
    gpu: s.gpu || undefined,
    cpu: s.cpu || undefined,
    ram: s.ram || undefined,
    console: s.console || undefined,
    monitor: undefined,
    storage: undefined,
    bookingStatus: { isBooked: false },
    timeSlots: [], // AdvancedBookingInterface generates its own from operatingHours
  }));

  const operatingHours = cafe
    ? { start: parseHour(cafe.opening_time), end: parseHour(cafe.closing_time) }
    : { start: 8, end: 22 };

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
    const totalHours = bookings.reduce((sum: number, b: any) => sum + b.timeSlots.length, 0);
    const totalPrice = totalHours * (cafe?.price_per_hour || 0);

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
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center"><p className="text-gray-500">Loading...</p></div>;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="rounded-xl overflow-hidden aspect-[16/6] bg-gray-100">
          {cafe.image_url ? (
            <img src={cafe.image_url} alt={cafe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{cafe.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-600">
            <div className="flex items-center gap-1"><MapPin className="w-5 h-5" /><span>{cafe.address}, {cafe.city}</span></div>
            {cafe.opening_time && cafe.closing_time && (
              <div className="flex items-center gap-1"><Clock className="w-5 h-5" /><span>{formatTime(cafe.opening_time)} - {formatTime(cafe.closing_time)}</span></div>
            )}
          </div>

          {/* Booking box */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border-2 border-purple-200">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-purple-600">${cafe.price_per_hour}</span>
                  <span className="text-gray-600">per hour</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
                <div><p className="text-sm text-gray-500">Gaming Systems</p><p className="font-medium">{systems.length} systems</p></div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-purple-600" />
                <div><p className="text-sm text-gray-500">Hours</p><p className="font-medium">{formatTime(cafe.opening_time)} - {formatTime(cafe.closing_time)}</p></div>
              </div>
              <div className="flex items-center">
                <Button onClick={handleBookNow} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg font-semibold">
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
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Gamepad2 className="w-6 h-6" />Available Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cafe.games.map((game) => (
                <div key={game} className="flex flex-col overflow-hidden rounded-lg border-2 border-gray-200">
                  <div className="w-full h-24 overflow-hidden bg-gray-100 flex items-center justify-center">
  {gameImages[game] ? (
    <img src={gameImages[game]} alt={game} className="w-full h-full object-cover" />
  ) : (
    <Gamepad2 className="w-8 h-8 text-gray-400" />
  )}
</div>
                  <div className="p-2 bg-white"><span className="text-sm font-medium">{game}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Flow */}
        <div ref={bookingRef} className="mb-6">
          {systems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-500">No gaming systems listed yet.</div>
          ) : showAdvancedBooking ? (
            <AdvancedBookingInterface
              systems={convertedSystems}
              cafeOperatingHours={operatingHours}
              onBookingComplete={handleBookingComplete}
              pricePerHour={cafe.price_per_hour}
              partySize={partySize!}
              numberOfFriends={numberOfFriends}
              numberOfHours={numberOfHours}
            />
          ) : showHourSelection ? (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">How Many Hours?</h2>
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <h3 className="text-lg font-semibold mb-3">
                  {partySize === "solo" ? "Select hours you want to play" : "Hours each person will play"}
                </h3>
                <div className="flex items-center gap-4">
                  <input type="number" min="1" max="12" value={numberOfHours}
                    onChange={(e) => setNumberOfHours(Math.max(1, Math.min(parseInt(e.target.value) || 1, 12)))}
                    className="w-24 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => setNumberOfHours(Math.max(1, numberOfHours - 1))} className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">-</button>
                    <button onClick={() => setNumberOfHours(Math.min(12, numberOfHours + 1))} className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">+</button>
                  </div>
                  <span className="text-sm text-gray-600">{numberOfHours === 1 ? "hour" : "hours"} per person</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowHourSelection(false)}>Back</Button>
                <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => setShowAdvancedBooking(true)}>Continue to Booking</Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">Select Party Size</h2>
              {!partySize ? (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <button onClick={() => setPartySize("solo")} className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="font-semibold">Playing Solo</div>
                    <div className="text-sm text-gray-600 mt-1">Just me</div>
                  </button>
                  <button onClick={() => setPartySize("group")} className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all">
                    <div className="text-4xl mb-2">👥</div>
                    <div className="font-semibold">With Friends</div>
                    <div className="text-sm text-gray-600 mt-1">Group gaming</div>
                  </button>
                </div>
              ) : partySize === "group" ? (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <h3 className="text-lg font-semibold mb-3">How many friends? (including you)</h3>
                  <div className="flex items-center gap-4">
                    <input type="number" min="2" max={systems.length} value={numberOfFriends}
                      onChange={(e) => setNumberOfFriends(Math.max(2, Math.min(parseInt(e.target.value) || 2, systems.length)))}
                      className="w-24 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg" />
                    <div className="flex gap-2">
                      <button onClick={() => setNumberOfFriends(Math.max(2, numberOfFriends - 1))} className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">-</button>
                      <button onClick={() => setNumberOfFriends(Math.min(systems.length, numberOfFriends + 1))} className="px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-100 font-semibold">+</button>
                    </div>
                    <span className="text-sm text-gray-600">people</span>
                  </div>
                </div>
              ) : null}
              {partySize && (
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => setShowHourSelection(true)}>Continue to Booking</Button>
              )}
            </div>
          )}
        </div>

        {/* Amenities */}
        {cafe.amenities && cafe.amenities.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Amenities</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {cafe.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-purple-600" />
                  </div>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <DbReviewsSection cafeId={cafe.id} cafeName={cafe.name} />
      </div>
    </div>
  );
}
