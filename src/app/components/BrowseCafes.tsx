import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router";
import {
  SlidersHorizontal, Star, MapPin, Monitor, Gamepad2,
  Cpu, Zap, ChevronRight,
  Users, Shield, Navigation, Loader2, Map as MapIcon,
  ShieldCheck, Timer, IndianRupee, Radio, Wrench, MessageSquare,
  BarChart3, CalendarClock, MousePointerClick, XCircle, CheckCircle2,
  ArrowRight, X, Clock, Search, Check,
} from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "../../supabase";
import { CafeMap, MapCafe } from "./CafeMap";
import { effectiveSystemPrice, minSystemPrice, maxSystemPrice } from "../utils/pricing";
import { searchAddresses, type AddressSuggestion } from "../utils/geocode";
import { SteamGameImage } from "./SteamGameImage";
import { hoursForUniformSchedule, type CafeHoursSchedule } from "../utils/cafeHours";
import { toLocalDateString } from "../utils/date";

/* ── Types ── */

interface DbCafe {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  price_per_hour: number;
  image_url: string | null;
  is_approved: boolean;
  latitude: number | null;
  longitude: number | null;
  games: string[] | null;
}

interface CafeHoursRow {
  cafe_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
}

/* Powerful hardware that gets a glow animation in the filter */
const POWERFUL_HW = new Set([
  "RTX 4090", "RTX 4080", "RTX 4080 SUPER", "RTX 4070 Ti SUPER", "RTX 4070 Ti",
  "RX 7900 XTX", "RX 7900 XT",
  "PS5 Pro", "PS5",
  "Xbox Series X",
]);

interface DbSystem {
  id: string;
  cafe_id: string;
  name: string;
  type: "PC" | "Console";
  gpu: string | null;
  cpu: string | null;
  ram: string | null;
  console: string | null;
  price_per_hour: number | null;
}

/* ── Hero slides ── */

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,58,95,0.7) 50%, rgba(8,145,178,0.6) 100%)",
    icon: Cpu,
    heading: "Pick your exact rig",
    sub: "See the GPU, CPU, RAM, and installed games before you book. No surprises when you sit down.",
    accent: "#06b6d4",
  },
  {
    image: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(26,16,37,0.88) 0%, rgba(76,29,149,0.7) 50%, rgba(124,58,237,0.6) 100%)",
    icon: ShieldCheck,
    heading: "Your slot, guaranteed",
    sub: "Availability updates in real time. Double-booking is blocked at the database level — not just the UI.",
    accent: "#a78bfa",
  },
  {
    image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(28,25,23,0.88) 0%, rgba(146,64,14,0.65) 50%, rgba(245,158,11,0.5) 100%)",
    icon: Timer,
    heading: "Walk in, pay by the minute",
    sub: "Arrive at 9:18? You pay from 9:18, not 9:00. Proportional billing, no rounding.",
    accent: "#fbbf24",
  },
  {
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(12,18,34,0.88) 0%, rgba(30,64,175,0.7) 50%, rgba(59,130,246,0.55) 100%)",
    icon: Users,
    heading: "Squad up, seat by seat",
    sub: "Book for your group — each player assigned to a specific machine, all at the same time.",
    accent: "#60a5fa",
  },
];

/* ── Problem → Solution pairs (the "Why GameSpot" transform cards) ── */

const PROBLEM_SOLUTIONS = [
  {
    icon: Cpu,
    accent: "#2563eb",
    problem: "You book a cafe and get handed a random PC — wrong GPU, and the game you came for isn't even installed.",
    solution: "Book the exact machine. Every rig lists its GPU, CPU, RAM or console and installed games before you pay.",
  },
  {
    icon: ShieldCheck,
    accent: "#0891b2",
    problem: "You show up on time and your slot was quietly given to a walk-in who got there first.",
    solution: "Booked is booked. Slots update live and a double-booking is made impossible to create — enforced right down to the database.",
  },
  {
    icon: Timer,
    accent: "#16a34a",
    problem: "You walk in, play twenty minutes, and still get charged for the full hour.",
    solution: "Walk-ins pay only for the minutes actually played — pro-rated to the minute, never rounded up.",
  },
  {
    icon: Radio,
    accent: "#7c3aed",
    problem: "The owner has no idea who's arriving, when, or on which machine — so overlaps turn into arguments.",
    solution: "Owners see every booking — name, phone, system, time — and run live walk-ins from one dashboard that stays in sync.",
  },
];

/* ── Feature capabilities, split by audience ── */

const GAMER_FEATURES = [
  { icon: Cpu, title: "Precision machine booking", desc: "Reserve one specific PC or console by its real specs." },
  { icon: Zap, title: "Real-time availability", desc: "Booked, occupied and reserved slots update instantly." },
  { icon: Users, title: "Solo & group booking", desc: "Book for yourself or a squad, assigned seat by seat." },
  { icon: Navigation, title: "Cafes near you", desc: "Share your location to rank cafes by distance on a live map." },
  { icon: SlidersHorizontal, title: "Smart filters", desc: "Filter by PC or console, price range, and free-slot availability." },
  { icon: Star, title: "Verified reviews", desc: "Ratings only from people who actually booked and played." },
  { icon: CalendarClock, title: "Your bookings, tracked", desc: "Upcoming and past sessions, with status and refunds, in one place." },
];

const OWNER_FEATURES = [
  { icon: BarChart3, title: "Owner dashboard", desc: "Revenue, players served and upcoming bookings at a glance." },
  { icon: Radio, title: "Live walk-in tracking", desc: "Start a walk-in, watch the timer, and end the session on the spot." },
  { icon: Shield, title: "Walk-in ↔ online sync", desc: "Physical and online bookings share one truth — no clashes." },
  { icon: IndianRupee, title: "Proportional pricing", desc: "Charge walk-ins fairly for the exact time they play." },
  { icon: Wrench, title: "Reserve & repair blocks", desc: "Hold a slot for a customer or mark a machine down for repair." },
  { icon: MessageSquare, title: "Reply to reviews", desc: "Answer customers publicly with a verified Cafe Owner badge." },
  { icon: MousePointerClick, title: "One-tap slot actions", desc: "Tap a slot in the grid to book, reserve, block or cancel." },
];

/* ── Hooks ── */

/** IntersectionObserver scroll-reveal: adds .reveal-visible with stagger delay */
function useScrollReveal(itemCount: number, key = "") {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("reveal-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    el.querySelectorAll(".reveal-hidden").forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [itemCount, key]);
  return containerRef;
}

/** 3D tilt on mouse — direct DOM, no re-renders */
function useCardTilt(ref: React.RefObject<HTMLElement | null>, intensity = 6) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform =
        `perspective(800px) rotateX(${y * -intensity}deg) rotateY(${x * intensity}deg) scale(1.02)`;
    };
    const onLeave = () => { el.style.transform = ""; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [ref, intensity]);
}

/** Hero parallax on mouse */
function useHeroParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const img = el.querySelector<HTMLElement>(".hero-parallax");
      if (img) img.style.transform = `translate(${x * -12}px, ${y * -8}px) scale(1.05)`;
    };
    const onLeave = () => {
      const img = el.querySelector<HTMLElement>(".hero-parallax");
      if (img) img.style.transform = "";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [ref]);
}

/* ── Cafe Card with 3D tilt ── */

function CafeCard({ cafe, cafeSystems, delay, distanceKm }: {
  cafe: DbCafe;
  cafeSystems: DbSystem[];
  delay: number;
  distanceKm?: number | null;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  useCardTilt(cardRef as React.RefObject<HTMLElement | null>, 5);

  const pcCount = cafeSystems.filter((s) => s.type === "PC").length;
  const consoleCount = cafeSystems.filter((s) => s.type === "Console").length;
  const highlightGpu = cafeSystems.find((s) => s.gpu)?.gpu;
  const highlightConsole = cafeSystems.find((s) => s.console)?.console;

  // Effective price range across this cafe's systems; show "₹low – ₹high" when they differ.
  const displayPrice = minSystemPrice(
    cafeSystems.map((s) => s.price_per_hour),
    cafe.price_per_hour
  );
  const maxPrice = maxSystemPrice(
    cafeSystems.map((s) => s.price_per_hour),
    cafe.price_per_hour
  );
  const pricesVary =
    new Set(cafeSystems.map((s) => effectiveSystemPrice(s.price_per_hour, cafe.price_per_hour))).size > 1;

  return (
    <Link
      ref={cardRef}
      id={`cafe-${cafe.id}`}
      to={`/cafe/db/${cafe.id}`}
      className="reveal-hidden cafe-tilt cafe-card-glow group block bg-white rounded-xl overflow-hidden shadow-sm scroll-mt-24"
      style={{ animationDelay: `${delay * 120}ms` }}
    >
      {/* Image with overlay */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {cafe.image_url ? (
          <img
            src={cafe.image_url}
            alt={cafe.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Gradient overlay with price */}
        <div className="cafe-card-overlay absolute inset-0" />
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
          <div>
            <h3 className="font-bold text-lg text-white drop-shadow-sm line-clamp-1">
              {cafe.name}
            </h3>
            <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{cafe.city}</span>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 text-right flex-shrink-0">
            <span className="font-bold text-base text-gray-900">
              ₹{displayPrice}{pricesVary ? `–₹${maxPrice}` : ""}
            </span>
            <span className="text-[10px] text-gray-500 block -mt-0.5">/hour</span>
          </div>
        </div>

        {/* System count badge */}
        {cafeSystems.length > 0 && (
          <div className="sys-count-badge absolute top-3 right-3 flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
            <Monitor className="w-3 h-3" />
            {cafeSystems.length} {cafeSystems.length === 1 ? "system" : "systems"}
          </div>
        )}

        {/* Distance badge (shown once the visitor shares their location) */}
        {typeof distanceKm === "number" && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
            <Navigation className="w-3 h-3" />
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </div>
        )}
      </div>

      {/* Card body — specs */}
      <div className="p-4">
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{cafe.description}</p>

        {cafeSystems.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {pcCount > 0 && (
              <span className="spec-chip inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                <Monitor className="w-3 h-3" /> {pcCount} PC{pcCount > 1 ? "s" : ""}
              </span>
            )}
            {consoleCount > 0 && (
              <span className="spec-chip inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                <Gamepad2 className="w-3 h-3" /> {consoleCount} Console{consoleCount > 1 ? "s" : ""}
              </span>
            )}
            {highlightGpu && (
              <span className="spec-chip inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                <Cpu className="w-3 h-3" /> {highlightGpu}
              </span>
            )}
            {highlightConsole && (
              <span className="spec-chip inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
                <Gamepad2 className="w-3 h-3" /> {highlightConsole}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>New listing</span>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{cafe.address}</span>
          </div>
          <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
            View <ChevronRight className="w-3 h-3 view-arrow" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Helpers ── */

/** Haversine-lite: find the city with the closest cafe to a given point */
function findNearestCity(loc: { lat: number; lng: number }, cafes: DbCafe[]): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of cafes) {
    if (c.latitude == null || c.longitude == null) continue;
    const dlat = (c.latitude - loc.lat) * 111_139;
    const dlng = (c.longitude - loc.lng) * 111_139 * Math.cos(loc.lat * Math.PI / 180);
    const d = dlat * dlat + dlng * dlng; // squared distance, no sqrt needed for comparison
    if (d < bestDist) { bestDist = d; best = normalizeCity(c.city); }
  }
  return best;
}

/** Normalize city: trim, title-case each word, and if it contains a comma take
 *  the last segment (handles "Baner Road, Baner, Pune" → "Pune", "PUNE" → "Pune",
 *  "greater noida" → "Greater Noida"). */
function normalizeCity(raw: string): string {
  const part = raw.includes(",") ? raw.split(",").pop()!.trim() : raw.trim();
  return part.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/* ── Main Component ── */

export function BrowseCafes() {
  /* ── City gate — mandatory before showing cafes ── */
  const [selectedCity, setSelectedCity] = useState<string | null>(() => {
    try { return localStorage.getItem("gamespot_city"); } catch { return null; }
  });
  const selectCity = (city: string) => {
    setSelectedCity(city);
    try { localStorage.setItem("gamespot_city", city); } catch {}
    // Reset filters when switching city
    clearLocationSearch();
    setPriceFilter("all");
    setAvailableCafeIds(null);
    setFilterHours([]);
    setSelectedGames([]);
    setSelectedHardware([]);
  };
  const clearCity = () => {
    setSelectedCity(null);
    try { localStorage.removeItem("gamespot_city"); } catch {}
  };

  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const locSearchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "under100" | "100to300" | "over300">("all");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({}); // cafe id -> metres
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [dbCafes, setDbCafes] = useState<DbCafe[]>([]);
  const [systems, setSystems] = useState<DbSystem[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroDir, setHeroDir] = useState<"enter" | "exit">("enter");

  /* Smart filters */
  const [showTimePanel, setShowTimePanel] = useState(false);
  const [showGamesPopup, setShowGamesPopup] = useState(false);
  const [showHardwarePopup, setShowHardwarePopup] = useState(false);
  const [filterDay, setFilterDay] = useState(0); // 0=today, 1=tomorrow…
  const [filterHours, setFilterHours] = useState<number[]>([]);
  const [cafeHoursMap, setCafeHoursMap] = useState<Record<string, CafeHoursSchedule>>({});
  const [availableCafeIds, setAvailableCafeIds] = useState<string[] | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedHardware, setSelectedHardware] = useState<string[]>([]);
  const [gameSearchQuery, setGameSearchQuery] = useState("");

  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useScrollReveal(dbCafes.length, selectedCity || "");
  useHeroParallax(heroRef);

  // All unique GPU/console values for autocomplete suggestions
  /* Fetch cafes + gaming systems + cafe hours */
  useEffect(() => {
    (async () => {
      const [{ data: cafesData }, { data: sysData }, { data: hoursData }] = await Promise.all([
        supabase
          .from("cafes")
          .select("id, name, description, city, address, price_per_hour, image_url, is_approved, latitude, longitude, games")
          .eq("is_approved", true),
        supabase
          .from("gaming_systems")
          .select("id, cafe_id, name, type, gpu, cpu, ram, console, price_per_hour"),
        supabase
          .from("cafe_hours")
          .select("cafe_id, day_of_week, open_time, close_time"),
      ]);
      if (cafesData) setDbCafes(cafesData as DbCafe[]);
      if (sysData) setSystems(sysData as DbSystem[]);
      if (hoursData) {
        // MVP: uniform schedule, so any day_of_week row works — take the first per cafe
        const map: Record<string, CafeHoursSchedule> = {};
        (hoursData as CafeHoursRow[]).forEach((r) => {
          if (!map[r.cafe_id]) map[r.cafe_id] = { open_time: r.open_time, close_time: r.close_time };
        });
        setCafeHoursMap(map);
      }
    })();
  }, []);

  /* Auto-rotate hero carousel */
  const advanceSlide = useCallback(() => {
    setHeroDir("exit");
    setTimeout(() => {
      setHeroIdx((i) => (i + 1) % HERO_SLIDES.length);
      setHeroDir("enter");
    }, 480);
  }, []);

  useEffect(() => {
    const timer = setInterval(advanceSlide, 5000);
    return () => clearInterval(timer);
  }, [advanceSlide]);

  const goToSlide = (i: number) => {
    if (i === heroIdx) return;
    setHeroDir("exit");
    setTimeout(() => { setHeroIdx(i); setHeroDir("enter"); }, 480);
  };

  /* Helpers */
  const systemsForCafe = (cafeId: string) => systems.filter((s) => s.cafe_id === cafeId);

  /* ── Smart filter: computed lists ── */
  const allGames = useMemo(() => {
    const set = new Set<string>();
    dbCafes.forEach((c) => (c.games || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [dbCafes]);

  const allHardware = useMemo(() => {
    const gpus = new Set<string>();
    const consoles = new Set<string>();
    systems.forEach((s) => {
      if (s.gpu) gpus.add(s.gpu);
      if (s.console) consoles.add(s.console);
    });
    return {
      gpus: Array.from(gpus).sort(),
      consoles: Array.from(consoles).sort(),
    };
  }, [systems]);

  // Union of all cafe operating hours (for the time picker display)
  const allHours = useMemo(() => {
    const set = new Set<number>();
    Object.values(cafeHoursMap).forEach((sched) => {
      hoursForUniformSchedule(sched).forEach((h) => set.add(h));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [cafeHoursMap]);

  /* ── City list for the gate (derived from loaded cafes, no extra query) ── */
  const cityList = useMemo(() => {
    const map = new Map<string, { count: number; systems: number; minPrice: number; maxPrice: number }>();
    dbCafes.forEach((c) => {
      const city = normalizeCity(c.city);
      const cafeSys = systems.filter((s) => s.cafe_id === c.id);
      const lo = minSystemPrice(cafeSys.map((s) => s.price_per_hour), c.price_per_hour);
      const hi = maxSystemPrice(cafeSys.map((s) => s.price_per_hour), c.price_per_hour);
      const prev = map.get(city);
      if (prev) {
        prev.count++;
        prev.systems += cafeSys.length;
        prev.minPrice = Math.min(prev.minPrice, lo);
        prev.maxPrice = Math.max(prev.maxPrice, hi);
      } else {
        map.set(city, { count: 1, systems: cafeSys.length, minPrice: lo, maxPrice: hi });
      }
    });
    return Array.from(map.entries())
      .map(([city, d]) => ({ city, ...d }))
      .sort((a, b) => b.count - a.count); // most cafes first
  }, [dbCafes, systems]);

  // If the stored city no longer has any cafes, clear it
  useEffect(() => {
    if (selectedCity && cityList.length > 0 && !cityList.some((c) => c.city === selectedCity)) {
      clearCity();
    }
  }, [selectedCity, cityList]);

  // 7-day strip (calendar-card format matching booking interface)
  const dayOptions = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return {
        offset: i,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dateNum: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      };
    }), []);

  const applyTimeFilter = async () => {
    if (filterHours.length === 0) { setAvailableCafeIds(null); return; }
    setCheckingAvailability(true);
    const dateObj = new Date(); dateObj.setDate(dateObj.getDate() + filterDay);
    const dateStr = toLocalDateString(dateObj);
    const allSystemIds = systems.map((s) => s.id);

    const [{ data: bookedSlots }, { data: walkIns }, { data: repairs }] = await Promise.all([
      supabase.rpc("get_booked_slots", { p_system_ids: allSystemIds, p_date: dateStr }),
      supabase.from("walk_in_sessions")
        .select("system_id, start_time, end_time, status")
        .in("system_id", allSystemIds).eq("session_date", dateStr).in("status", ["scheduled", "active"]),
      supabase.from("repair_slots")
        .select("system_id, start_hour, end_hour")
        .in("system_id", allSystemIds).eq("repair_date", dateStr),
    ]);

    // Build occupied: system_id → Set<hour>
    const occ: Record<string, Set<number>> = {};
    const mark = (sid: string, h: number) => { if (!occ[sid]) occ[sid] = new Set(); occ[sid].add(h); };
    (bookedSlots || []).forEach((b: any) => {
      const s = parseInt(b.start_time.split(":")[0]), e = parseInt(b.end_time.split(":")[0]);
      for (let h = s; h < e; h++) mark(b.system_id, h);
    });
    (walkIns || []).forEach((w: any) => { for (let h = w.start_time; h < w.end_time; h++) mark(w.system_id, h); });
    (repairs || []).forEach((r: any) => { for (let h = r.start_hour; h < r.end_hour; h++) mark(r.system_id, h); });

    // Cafe passes if any system has ALL selected hours free AND within operating hours
    const passed: string[] = [];
    for (const cafe of dbCafes) {
      const sched = cafeHoursMap[cafe.id];
      const cafeHrs = sched ? new Set(hoursForUniformSchedule(sched)) : new Set<number>();
      const cafeSys = systems.filter((s) => s.cafe_id === cafe.id);
      const hasFree = cafeSys.some((sys) =>
        filterHours.every((h) => cafeHrs.has(h) && !occ[sys.id]?.has(h))
      );
      if (hasFree) passed.push(cafe.id);
    }
    setAvailableCafeIds(passed);
    setCheckingAvailability(false);
  };

  const clearTimeFilter = () => {
    setFilterHours([]); setAvailableCafeIds(null); setShowTimePanel(false);
  };

  const toggleFilterHour = (h: number) =>
    setFilterHours((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b));

  const toggleGame = (g: string) =>
    setSelectedGames((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const toggleHardware = (hw: string) =>
    setSelectedHardware((prev) => prev.includes(hw) ? prev.filter((x) => x !== hw) : [...prev, hw]);

  const isPowerful = (hw: string) => Array.from(POWERFUL_HW).some((p) => hw.includes(p));

  /* ── Shared: geocode a point → nearby_cafes RPC → distance sort ── */
  const applyLocationSort = async (loc: { lat: number; lng: number }) => {
    setUserLoc(loc);
    const { data } = await supabase.rpc("nearby_cafes", {
      p_lat: loc.lat,
      p_lng: loc.lng,
      p_radius_m: 2_000_000,
      p_limit: 200,
    });
    const map: Record<string, number> = {};
    (data || []).forEach((r: { id: string; distance_m: number }) => {
      map[r.id] = r.distance_m;
    });
    setDistances(map);
  };

  /* ── Location search: debounced autocomplete from Nominatim ── */
  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setSelectedLocationLabel("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setLocationSuggestions([]);
      setShowLocDropdown(false);
      return;
    }
    setSearchingLocation(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(value);
      setLocationSuggestions(results);
      setShowLocDropdown(results.length > 0);
      setSearchingLocation(false);
    }, 350);
  };

  const pickLocationSuggestion = async (s: AddressSuggestion) => {
    setLocationQuery(s.label);
    setSelectedLocationLabel(s.label);
    setShowLocDropdown(false);
    setLocationSuggestions([]);
    setLocating(true);
    setLocError("");
    await applyLocationSort({ lat: s.lat, lng: s.lng });
    setLocating(false);
  };

  const clearLocationSearch = () => {
    setLocationQuery("");
    setSelectedLocationLabel("");
    setLocationSuggestions([]);
    setShowLocDropdown(false);
    setUserLoc(null);
    setDistances({});
  };

  // Close location dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locSearchRef.current && !locSearchRef.current.contains(e.target as Node)) setShowLocDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Locate via GPS (opt-in shortcut — same as Airbnb's "Use current location") */
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Location isn't available on this device. Pick your city instead.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Auto-select nearest city if no city chosen yet
        if (!selectedCity && dbCafes.length > 0) {
          const nearest = findNearestCity(loc, dbCafes);
          if (nearest) selectCity(nearest);
        }
        setSelectedLocationLabel("My location");
        setLocationQuery("My location");
        await applyLocationSort(loc);
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location. Pick your city instead.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const filteredCafes = dbCafes.filter((cafe) => {
    // City gate: only show cafes in the selected city (normalized)
    if (selectedCity && normalizeCity(cafe.city) !== selectedCity) return false;
    const cafeSys = systemsForCafe(cafe.id);
    const cafePrice = minSystemPrice(cafeSys.map((s) => s.price_per_hour), cafe.price_per_hour);
    const matchesPrice = priceFilter === "all" ||
      (priceFilter === "under100" && cafePrice < 100) ||
      (priceFilter === "100to300" && cafePrice >= 100 && cafePrice <= 300) ||
      (priceFilter === "over300" && cafePrice > 300);
    const matchesTime = availableCafeIds === null || availableCafeIds.includes(cafe.id);
    const matchesGames = selectedGames.length === 0 ||
      selectedGames.some((g) => (cafe.games || []).includes(g));
    const matchesHardware = selectedHardware.length === 0 ||
      cafeSys.some((s) =>
        selectedHardware.some((hw) => {
          const l = hw.toLowerCase();
          return (s.gpu?.toLowerCase().includes(l)) || (s.console?.toLowerCase().includes(l));
        })
      );
    return matchesPrice && matchesTime && matchesGames && matchesHardware;
  });

  // When the visitor has shared location, sort nearest-first (cafes without a distance
  // sink to the bottom). Otherwise keep the default order.
  const hasDistances = userLoc && Object.keys(distances).length > 0;
  const displayCafes = hasDistances
    ? [...filteredCafes].sort(
        (a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity)
      )
    : filteredCafes;

  const mapCafes: MapCafe[] = displayCafes
    .filter((c) => typeof c.latitude === "number" && typeof c.longitude === "number")
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      latitude: c.latitude as number,
      longitude: c.longitude as number,
      price_per_hour: minSystemPrice(systemsForCafe(c.id).map((s) => s.price_per_hour), c.price_per_hour),
      priceMax: maxSystemPrice(systemsForCafe(c.id).map((s) => s.price_per_hour), c.price_per_hour),
      distanceKm: distances[c.id] != null ? distances[c.id] / 1000 : null,
    }));

  const slide = HERO_SLIDES[heroIdx];
  const SlideIcon = slide.icon;

  return (
    <>
    <div className="browse-bg min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── Hero Carousel with parallax ── */}
      <div className="animate-in mb-8 relative" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div
          ref={heroRef}
          className="relative rounded-2xl overflow-hidden cursor-default"
          style={{ minHeight: 300 }}
        >
          {/* Background image + gradient overlay */}
          <div
            className={heroDir === "enter" ? "hero-slide-enter" : "hero-slide-exit"}
            key={heroIdx}
            style={{ position: "absolute", inset: 0 }}
          >
            <div className="hero-parallax absolute inset-0">
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute inset-0" style={{ background: slide.overlay }} />
          </div>

          {/* Content */}
          <div
            className={`relative z-10 flex items-center p-8 md:p-12 ${heroDir === "enter" ? "hero-slide-enter" : "hero-slide-exit"}`}
            key={`c-${heroIdx}`}
            style={{ minHeight: 300 }}
          >
            <div className="flex-1 max-w-xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                style={{ background: `${slide.accent}22`, border: `1px solid ${slide.accent}44` }}
              >
                <Gamepad2 className="w-4 h-4" style={{ color: slide.accent }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: slide.accent }}>
                  GameSpot
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                {slide.heading}
              </h2>
              <p className="text-white/70 text-base md:text-lg mb-6 max-w-md">
                {slide.sub}
              </p>
              <button
                onClick={() => document.getElementById("cafe-grid")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white group/btn"
                style={{ background: slide.accent }}
              >
                Browse Cafes <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>

            {/* Large icon decoration */}
            <div className="hidden md:flex items-center justify-center flex-shrink-0">
              <SlideIcon
                className="w-32 h-32 lg:w-44 lg:h-44"
                style={{ color: `${slide.accent}30` }}
                strokeWidth={1}
              />
            </div>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`hero-dot ${i === heroIdx ? "hero-dot-active" : ""}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── City Gate — mandatory before showing cafes ── */}
      {!selectedCity && (
        <div className="animate-in mb-8" style={{ "--stagger": 2 } as React.CSSProperties}>
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-900/50 border border-slate-700/60 p-6 search-glow transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 search-heading-gradient">Select your city</h2>
            <p className="text-slate-400 text-sm mb-5">Choose where you want to play — we'll show you all the gaming cafes there.</p>

            {cityList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="ml-3 text-slate-400">Loading cities…</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cityList.map((c) => (
                  <button
                    key={c.city}
                    onClick={() => selectCity(c.city)}
                    className="group relative flex flex-col items-start gap-1.5 p-4 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:border-cyan-500/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-500/10 transition-all active:scale-[0.97] text-left"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="font-bold text-white text-base truncate">{c.city}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 pl-6">
                      <span>{c.count} {c.count === 1 ? "cafe" : "cafes"}</span>
                      <span>{c.systems} systems</span>
                    </div>
                    <div className="text-[11px] text-cyan-400/80 font-medium pl-6">
                      ₹{c.minPrice}–₹{c.maxPrice}/hr
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* GPS shortcut below city cards */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600/60 text-slate-300 text-sm font-medium hover:border-cyan-500/40 hover:text-cyan-300 transition-all active:scale-95"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Use my current location
              </button>
              {locError && <span className="text-xs text-amber-500 self-center ml-3">{locError}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Location Search + Filters (shown only after city selected) ── */}
      {selectedCity && (
      <div className="animate-in bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-900/50 border border-slate-700/60 p-6 mb-8 search-glow transition-shadow" style={{ "--stagger": 3 } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold search-heading-gradient">Cafes in {selectedCity}</h2>
          <button onClick={clearCity} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
            <MapPin className="w-4 h-4" /> Change city
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Airbnb-style location combobox */}
          <div className="flex-1 relative" ref={locSearchRef}>
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              role="combobox"
              aria-expanded={showLocDropdown}
              aria-autocomplete="list"
              placeholder={selectedCity ? `Search area in ${selectedCity}...` : "Search city, area, landmark..."}
              value={locationQuery}
              onChange={(e) => handleLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (locationSuggestions.length > 0) {
                    pickLocationSuggestion(locationSuggestions[0]);
                  }
                }
              }}
              onFocus={() => setShowLocDropdown(true)}
              className="pl-10 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchingLocation && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {selectedLocationLabel && (
                <button onClick={clearLocationSearch}
                  className="p-1 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                  title="Clear location">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={useMyLocation} disabled={locating}
                className="p-1.5 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all active:scale-95"
                title="Use my current location"
                aria-label="Use my current location">
                {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              </button>
            </div>
            {/* Location suggestions dropdown */}
            {showLocDropdown && !selectedLocationLabel && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600/60 rounded-xl shadow-xl shadow-black/30 overflow-hidden animate-dropdown">
                {/* Always show "Use current location" — the Airbnb pattern */}
                <button onClick={useMyLocation} disabled={locating}
                  className="w-full px-3 py-3 text-left text-sm hover:bg-cyan-500/10 transition-colors flex items-center gap-3 font-medium text-cyan-400">
                  {locating
                    ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                    : <Navigation className="w-5 h-5 flex-shrink-0" />}
                  <span>Use current location</span>
                </button>
                {locationSuggestions.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-700/60">Locations</div>
                    {locationSuggestions.map((s, i) => (
                      <button key={i} onClick={() => pickLocationSuggestion(s)}
                        className="w-full px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-cyan-500/10 transition-colors flex items-center gap-3 border-t border-slate-700/40">
                        <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Smart filter cards ── */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {/* Time Slots */}
          <button
            onClick={() => { setShowTimePanel((v) => !v); setShowGamesPopup(false); setShowHardwarePopup(false); }}
            className={`smart-filter-card group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
              showTimePanel || availableCafeIds !== null
                ? "border-cyan-500/60 bg-slate-800 shadow-lg shadow-cyan-500/10"
                : "border-slate-700/60 bg-slate-800/80 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5"
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-colors ${availableCafeIds !== null ? "bg-cyan-500/20" : "bg-slate-700/60 group-hover:bg-cyan-500/10"}`}>
              <Clock className={`w-5 h-5 ${availableCafeIds !== null ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
            </div>
            <span className="text-sm font-semibold text-white">Time Slots</span>
            <span className="text-[11px] text-slate-400 leading-tight text-center">
              {availableCafeIds !== null
                ? `${dayOptions[filterDay].label}, ${filterHours.map((h) => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`).join(", ")}`
                : "Any time"}
            </span>
            {availableCafeIds !== null && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-900 text-[10px] font-bold flex items-center justify-center smart-filter-badge">
                {filterHours.length}
              </span>
            )}
          </button>

          {/* Games */}
          <button
            onClick={() => { setShowGamesPopup(true); setShowTimePanel(false); setShowHardwarePopup(false); }}
            className={`smart-filter-card group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
              selectedGames.length > 0
                ? "border-purple-500/60 bg-slate-800 shadow-lg shadow-purple-500/10"
                : "border-slate-700/60 bg-slate-800/80 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5"
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-colors ${selectedGames.length > 0 ? "bg-purple-500/20" : "bg-slate-700/60 group-hover:bg-purple-500/10"}`}>
              <Gamepad2 className={`w-5 h-5 ${selectedGames.length > 0 ? "text-purple-400" : "text-slate-400 group-hover:text-purple-400"}`} />
            </div>
            <span className="text-sm font-semibold text-white">Games</span>
            <span className="text-[11px] text-slate-400 leading-tight text-center truncate max-w-full">
              {selectedGames.length > 0
                ? selectedGames.length === 1 ? selectedGames[0] : `${selectedGames[0]} +${selectedGames.length - 1}`
                : "All games"}
            </span>
            {selectedGames.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center smart-filter-badge">
                {selectedGames.length}
              </span>
            )}
          </button>

          {/* Hardware */}
          <button
            onClick={() => { setShowHardwarePopup(true); setShowTimePanel(false); setShowGamesPopup(false); }}
            className={`smart-filter-card group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
              selectedHardware.length > 0
                ? "border-emerald-500/60 bg-slate-800 shadow-lg shadow-emerald-500/10"
                : "border-slate-700/60 bg-slate-800/80 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
            }`}
          >
            <div className={`p-2.5 rounded-xl transition-colors ${selectedHardware.length > 0 ? "bg-emerald-500/20" : "bg-slate-700/60 group-hover:bg-emerald-500/10"}`}>
              <Cpu className={`w-5 h-5 ${selectedHardware.length > 0 ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400"}`} />
            </div>
            <span className="text-sm font-semibold text-white">Hardware</span>
            <span className="text-[11px] text-slate-400 leading-tight text-center truncate max-w-full">
              {selectedHardware.length > 0
                ? selectedHardware.length === 1 ? selectedHardware[0] : `${selectedHardware[0]} +${selectedHardware.length - 1}`
                : "Any specs"}
            </span>
            {selectedHardware.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center smart-filter-badge">
                {selectedHardware.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Time Slots Panel (expandable) ── */}
        {showTimePanel && (
          <div className="mt-3 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5 animate-dropdown overflow-hidden">
            {/* Calendar-card date strip (matches booking interface) */}
            <div className="flex border-b border-slate-700/60 overflow-x-auto">
              {dayOptions.map((d, i) => (
                <button key={d.offset} onClick={() => { setFilterDay(d.offset); setFilterHours([]); setAvailableCafeIds(null); }}
                  className={`flex-shrink-0 px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col items-center justify-center min-w-[60px] sm:min-w-[80px] transition-all ${
                    filterDay === d.offset ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700/60"
                  } ${i !== 0 ? "border-l border-slate-700/60" : ""}`}>
                  <div className="text-[11px] sm:text-xs font-semibold">{d.day}</div>
                  <div className="text-xl sm:text-2xl font-bold my-0.5">{d.dateNum}</div>
                  <div className="text-[10px] sm:text-xs font-medium opacity-80">{d.month}</div>
                </button>
              ))}
            </div>
            {/* Slot grid (booking-interface style) */}
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {allHours.length === 0 && <p className="text-xs text-slate-500">Loading hours…</p>}
                {allHours.map((h) => {
                  const label = `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
                  const selected = filterHours.includes(h);
                  return (
                    <button key={h} onClick={() => toggleFilterHour(h)}
                      className={`filter-chip min-w-[90px] sm:min-w-[110px] px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all border ${
                        selected
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/20"
                          : "bg-transparent text-slate-300 border-slate-600/60 hover:border-cyan-500/40 hover:text-cyan-300"
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={applyTimeFilter} disabled={filterHours.length === 0 || checkingAvailability}
                  className="px-4 py-2 bg-cyan-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-cyan-500/30">
                  {checkingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {checkingAvailability ? "Checking…" : "Find available cafes"}
                </button>
                {(filterHours.length > 0 || availableCafeIds !== null) && (
                  <button onClick={clearTimeFilter} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    Clear
                  </button>
                )}
                {availableCafeIds !== null && (
                  <span className="text-sm font-semibold ml-auto flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">{availableCafeIds.length}</span>
                    <span className="text-slate-400">of {dbCafes.length} {dbCafes.length === 1 ? "cafe" : "cafes"} available</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter chips — price only */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs font-medium text-slate-400 self-center mr-1">Price:</span>
          {([["all", "Any"], ["under100", "Under ₹100"], ["100to300", "₹100–300"], ["over300", "₹300+"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPriceFilter(val)}
              className={`filter-chip px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                priceFilter === val
                  ? "bg-cyan-500 text-slate-900 shadow-sm shadow-cyan-500/30"
                  : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Results count + controls (city selected only) ── */}
      {selectedCity && (
      <>
      <div className="animate-in flex flex-wrap items-center justify-between gap-2 mb-4" style={{ "--stagger": 4 } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <p className="text-gray-600 font-medium">
            {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"} in {selectedCity}
          </p>
          {hasDistances && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="live-dot" /> Sorted by distance{selectedLocationLabel ? ` from ${selectedLocationLabel.split(",")[0]}` : ""}
            </span>
          )}
          {locError && <span className="text-xs text-amber-600">{locError}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap((v) => !v)}
            className="filter-chip flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-600/60 text-slate-200 text-sm font-semibold hover:bg-slate-700/60 transition-colors"
          >
            <MapIcon className="w-4 h-4" /> {showMap ? "Hide map" : "Show map"}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/40 px-3 py-1.5 rounded-full">
            <span className="live-dot" />
            <Zap className="w-3 h-3 text-green-500" />
            Real-time availability
          </div>
        </div>
      </div>

      {/* ── Map panel ── */}
      {showMap && mapCafes.length > 0 && (
        <div className="animate-in mb-6" style={{ "--stagger": 4 } as React.CSSProperties}>
          <CafeMap
            cafes={mapCafes}
            userLoc={userLoc}
            onSelect={(id) =>
              document.getElementById(`cafe-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          />
        </div>
      )}

      {/* ── Cafes Grid with scroll-reveal + 3D tilt ── */}
      <div ref={gridRef} id="cafe-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCafes.map((cafe, idx) => (
          <CafeCard
            key={cafe.id}
            cafe={cafe}
            cafeSystems={systemsForCafe(cafe.id)}
            delay={idx}
            distanceKm={distances[cafe.id] != null ? distances[cafe.id] / 1000 : null}
          />
        ))}
      </div>

      {filteredCafes.length === 0 && (
        <div className="text-center py-16">
          <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No cafes found matching your filters</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}
      </>
      )}

      {/* ── Why GameSpot — problem → solution ── */}
      <section className="mt-16" aria-labelledby="why-gamespot">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-3">
            <Zap className="w-3 h-3" /> Why GameSpot
          </span>
          <h2 id="why-gamespot" className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Booking a gaming cafe is broken. We fixed it.
          </h2>
          <p className="text-gray-500 mt-2">
            Four things gamers and cafe owners put up with for years — and what we do instead.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PROBLEM_SOLUTIONS.map((ps) => {
            const Icon = ps.icon;
            return (
              <div key={ps.problem} className="ps-card p-5 md:p-6">
                <div className="grid sm:grid-cols-[1fr_auto_1fr] items-stretch gap-4">
                  {/* The old way */}
                  <div className="ps-problem rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" /> The old way
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{ps.problem}</p>
                  </div>

                  {/* Transform arrow */}
                  <div className="ps-arrow flex sm:flex-col items-center justify-center">
                    <ArrowRight className="w-6 h-6 rotate-90 sm:rotate-0" />
                  </div>

                  {/* With GameSpot */}
                  <div className="ps-solution rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: ps.accent }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> With GameSpot
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${ps.accent}14`, color: ps.accent }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-medium text-gray-800 leading-relaxed">{ps.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Everything you can do — feature grid, split by audience ── */}
      <section className="mt-16" aria-labelledby="features">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full mb-3">
            <Gamepad2 className="w-3 h-3" /> Everything you can do
          </span>
          <h2 id="features" className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            One platform, both sides of the counter
          </h2>
          <p className="text-gray-500 mt-2">
            Precision booking for gamers. Live operations for cafe owners.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* For gamers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Monitor className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">For Gamers</h3>
            </div>
            <div className="space-y-3">
              {GAMER_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="feat-card flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-3.5">
                    <div className="feat-icon w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* For cafe owners */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">For Cafe Owners</h3>
            </div>
            <div className="space-y-3">
              {OWNER_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="feat-card flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-3.5">
                    <div className="feat-icon w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA banner ── */}
      <div className="animate-in mt-12 mb-4" style={{ "--stagger": 5 } as React.CSSProperties}>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-8 md:p-10">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Own a Gaming Cafe?</h3>
              <p className="text-blue-200 text-sm md:text-base max-w-md">
                Join the GameSpot network. Get online bookings, manage walk-ins, and grow your business.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              <Users className="w-4 h-4" />
              Register Your Cafe
            </Link>
          </div>
        </div>
      </div>
    </div>

    </div>

    {/* ── Games Popup (outside browse-bg to avoid fixed-position breakage) ── */}
    {showGamesPopup && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowGamesPopup(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm smart-filter-backdrop" />
        <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-purple-500/10 w-full max-w-2xl max-h-[80vh] flex flex-col smart-filter-popup" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Choose Games</h3>
                <p className="text-xs text-slate-400">{selectedGames.length > 0 ? `${selectedGames.length} selected` : "Select games to filter cafes"}</p>
              </div>
            </div>
            <button onClick={() => setShowGamesPopup(false)} className="p-2 rounded-lg hover:bg-slate-700/60 transition-colors active:scale-95">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={gameSearchQuery} onChange={(e) => setGameSearchQuery(e.target.value)}
                placeholder="Search games..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-600/60 bg-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20" />
            </div>
          </div>
          {/* Game grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {allGames
                .filter((g) => !gameSearchQuery || g.toLowerCase().includes(gameSearchQuery.toLowerCase()))
                .map((game, i) => {
                  const sel = selectedGames.includes(game);
                  return (
                    <button key={game} onClick={() => toggleGame(game)}
                      className={`game-filter-card relative flex flex-col overflow-hidden rounded-xl border transition-all text-left ${
                        sel ? "border-purple-500/60 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30" : "border-slate-600/60 hover:border-purple-500/40 hover:shadow-md"
                      }`}
                      style={{ "--card-delay": `${i * 30}ms` } as React.CSSProperties}>
                      <div className="w-full h-20 overflow-hidden bg-slate-800 flex items-center justify-center">
                        <SteamGameImage game={game} />
                      </div>
                      <div className="p-2.5 bg-slate-800/80 flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate flex-1">{game}</span>
                        {sel && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      </div>
                      {sel && <div className="absolute inset-0 bg-purple-500/10 pointer-events-none" />}
                    </button>
                  );
                })}
            </div>
            {allGames.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">No games listed by any cafe yet</p>
            )}
          </div>
          {/* Footer */}
          {selectedGames.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-700/60 bg-slate-800/80 rounded-b-2xl">
              <button onClick={() => setSelectedGames([])} className="text-sm text-slate-400 hover:text-white transition-colors">Clear all</button>
              <button onClick={() => setShowGamesPopup(false)}
                className="px-5 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-400 transition-all active:scale-95 shadow-sm shadow-purple-500/30">
                Show {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"}
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── Hardware Popup (outside browse-bg to avoid fixed-position breakage) ── */}
    {showHardwarePopup && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowHardwarePopup(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm smart-filter-backdrop" />
        <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-emerald-500/10 w-full max-w-lg max-h-[80vh] flex flex-col smart-filter-popup" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Cpu className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Choose Hardware</h3>
                <p className="text-xs text-slate-400">{selectedHardware.length > 0 ? `${selectedHardware.length} selected` : "Filter cafes by specs"}</p>
              </div>
            </div>
            <button onClick={() => setShowHardwarePopup(false)} className="p-2 rounded-lg hover:bg-slate-700/60 transition-colors active:scale-95">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          {/* Hardware list */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {/* GPUs */}
            {allHardware.gpus.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> Graphics Cards
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allHardware.gpus.map((gpu) => {
                    const sel = selectedHardware.includes(gpu);
                    const powerful = isPowerful(gpu);
                    return (
                      <button key={gpu} onClick={() => toggleHardware(gpu)}
                        className={`hw-chip px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          sel
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                            : powerful
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 hw-powerful"
                              : "bg-slate-800 text-slate-300 border border-slate-600/60 hover:border-emerald-500/40"
                        }`}>
                        {powerful && !sel && <Zap className="w-3 h-3 text-amber-400" />}
                        {sel && <Check className="w-3 h-3" />}
                        {gpu}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Consoles */}
            {allHardware.consoles.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" /> Consoles
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allHardware.consoles.map((con) => {
                    const sel = selectedHardware.includes(con);
                    const powerful = isPowerful(con);
                    return (
                      <button key={con} onClick={() => toggleHardware(con)}
                        className={`hw-chip px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          sel
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                            : powerful
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 hw-powerful"
                              : "bg-slate-800 text-slate-300 border border-slate-600/60 hover:border-emerald-500/40"
                        }`}>
                        {powerful && !sel && <Zap className="w-3 h-3 text-amber-400" />}
                        {sel && <Check className="w-3 h-3" />}
                        {con}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {allHardware.gpus.length === 0 && allHardware.consoles.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">No hardware data available</p>
            )}
          </div>
          {/* Footer */}
          {selectedHardware.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-700/60 bg-slate-800/80 rounded-b-2xl">
              <button onClick={() => setSelectedHardware([])} className="text-sm text-slate-400 hover:text-white transition-colors">Clear all</button>
              <button onClick={() => setShowHardwarePopup(false)}
                className="px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-400 transition-all active:scale-95 shadow-sm shadow-emerald-500/30">
                Show {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"}
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    </>
  );
}
