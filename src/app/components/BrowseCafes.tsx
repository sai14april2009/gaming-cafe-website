import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router";
import {
  Search, SlidersHorizontal, Star, MapPin, Monitor, Gamepad2,
  Cpu, Zap, ChevronRight, Flame, Trophy, Swords, Target,
  Users, Wifi, Shield, Navigation, Loader2, Map as MapIcon,
  ShieldCheck, Timer, IndianRupee, Radio, Wrench, MessageSquare,
  BarChart3, CalendarClock, MousePointerClick, XCircle, CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "../../supabase";
import { CafeMap, MapCafe } from "./CafeMap";
import { effectiveSystemPrice, minSystemPrice, maxSystemPrice } from "../utils/pricing";

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
}

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
    icon: Swords,
    heading: "Level Up Your Game",
    sub: "Premium rigs. Zero lag. Book your station and dominate.",
    accent: "#06b6d4",
  },
  {
    image: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(26,16,37,0.88) 0%, rgba(76,29,149,0.7) 50%, rgba(124,58,237,0.6) 100%)",
    icon: Trophy,
    heading: "Where Champions Play",
    sub: "RTX-powered PCs, PS5s, tournament setups — all near you.",
    accent: "#a78bfa",
  },
  {
    image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(28,25,23,0.88) 0%, rgba(146,64,14,0.65) 50%, rgba(245,158,11,0.5) 100%)",
    icon: Flame,
    heading: "No Setup. Just Play.",
    sub: "Walk in or book ahead. Your perfect gaming session starts here.",
    accent: "#fbbf24",
  },
  {
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(12,18,34,0.88) 0%, rgba(30,64,175,0.7) 50%, rgba(59,130,246,0.55) 100%)",
    icon: Target,
    heading: "Book. Play. Win.",
    sub: "Pick your exact machine, see the specs, lock your slot.",
    accent: "#60a5fa",
  },
  {
    image: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(6,20,18,0.88) 0%, rgba(6,95,70,0.68) 50%, rgba(16,185,129,0.52) 100%)",
    icon: Cpu,
    heading: "Book the Exact Machine",
    sub: "See the GPU, the specs, the installed games — then lock it in.",
    accent: "#34d399",
  },
  {
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(28,10,20,0.9) 0%, rgba(136,19,55,0.62) 50%, rgba(244,63,94,0.5) 100%)",
    icon: ShieldCheck,
    heading: "Never Double-Booked",
    sub: "Your slot is yours. Real-time availability makes a clash impossible.",
    accent: "#fb7185",
  },
  {
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(20,20,6,0.88) 0%, rgba(63,98,18,0.62) 50%, rgba(132,204,22,0.5) 100%)",
    icon: Timer,
    heading: "Pay Only for What You Play",
    sub: "Walk in mid-hour? You're charged by the minute, never rounded up.",
    accent: "#a3e635",
  },
  {
    image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&q=80",
    overlay: "linear-gradient(135deg, rgba(8,18,30,0.88) 0%, rgba(14,116,144,0.62) 50%, rgba(34,211,238,0.5) 100%)",
    icon: Navigation,
    heading: "Cafes Near You, Ranked",
    sub: "Share your location and find the closest rigs, sorted by distance.",
    accent: "#22d3ee",
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
function useScrollReveal(itemCount: number) {
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
  }, [itemCount]);
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

/* ── Main Component ── */

export function BrowseCafes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [systemTypeFilter, setSystemTypeFilter] = useState<"all" | "pc" | "console">("all");
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

  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useScrollReveal(dbCafes.length);
  useHeroParallax(heroRef);

  /* Fetch cafes + gaming systems */
  useEffect(() => {
    (async () => {
      const [{ data: cafesData }, { data: sysData }] = await Promise.all([
        supabase
          .from("cafes")
          .select("id, name, description, city, address, price_per_hour, image_url, is_approved, latitude, longitude")
          .eq("is_approved", true),
        supabase
          .from("gaming_systems")
          .select("id, cafe_id, name, type, gpu, cpu, ram, console, price_per_hour"),
      ]);
      if (cafesData) setDbCafes(cafesData as DbCafe[]);
      if (sysData) setSystems(sysData as DbSystem[]);
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
  const cities = ["all", ...Array.from(new Set(dbCafes.map((c) => c.city)))];

  /* Locate the visitor (opt-in) and rank cafes by real distance via the nearby_cafes RPC.
     The city dropdown stays the default path — this only runs if they tap the button. */
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
        setUserLoc(loc);
        const { data } = await supabase.rpc("nearby_cafes", {
          p_lat: loc.lat,
          p_lng: loc.lng,
          p_radius_m: 2_000_000, // wide net so every cafe gets a distance; nearest sort to top
          p_limit: 200,
        });
        const map: Record<string, number> = {};
        (data || []).forEach((r: { id: string; distance_m: number }) => {
          map[r.id] = r.distance_m;
        });
        setDistances(map);
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location. Showing cafes by city instead.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const filteredCafes = dbCafes.filter((cafe) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      cafe.name.toLowerCase().includes(q) ||
      cafe.address.toLowerCase().includes(q) ||
      cafe.city.toLowerCase().includes(q);
    const matchesCity = selectedCity === "all" || cafe.city === selectedCity;
    const cafeSys = systemsForCafe(cafe.id);
    const matchesType =
      systemTypeFilter === "all" ||
      (systemTypeFilter === "pc" && cafeSys.some((s) => s.type === "PC")) ||
      (systemTypeFilter === "console" && cafeSys.some((s) => s.type === "Console"));
    // Filter on the cafe's cheapest effective rate — matches the "from ₹X" shown on the card.
    const cafePrice = minSystemPrice(cafeSys.map((s) => s.price_per_hour), cafe.price_per_hour);
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "under100" && cafePrice < 100) ||
      (priceFilter === "100to300" && cafePrice >= 100 && cafePrice <= 300) ||
      (priceFilter === "over300" && cafePrice > 300);
    return matchesSearch && matchesCity && matchesType && matchesPrice;
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
      distanceKm: distances[c.id] != null ? distances[c.id] / 1000 : null,
    }));

  const totalSystems = systems.length;
  const totalCafes = dbCafes.length;

  const slide = HERO_SLIDES[heroIdx];
  const SlideIcon = slide.icon;

  return (
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
            {/* Glow orbs */}
            <div
              className="hero-glow absolute rounded-full blur-3xl"
              style={{ width: 200, height: 200, background: slide.accent, opacity: 0.2, top: "10%", right: "15%" }}
            />
            <div
              className="hero-glow absolute rounded-full blur-3xl"
              style={{ width: 150, height: 150, background: slide.accent, opacity: 0.12, bottom: "10%", left: "10%", animationDelay: "3s" }}
            />
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
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-shimmer mb-3 leading-tight">
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

      {/* ── Animated stats row ── */}
      <div className="animate-in grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" style={{ "--stagger": 1 } as React.CSSProperties}>
        {[
          { icon: Monitor, label: "Gaming Systems", value: `${totalSystems}+`, color: "text-blue-600", bg: "bg-blue-50", delay: 0 },
          { icon: Gamepad2, label: "Verified Cafes", value: String(totalCafes), color: "text-purple-600", bg: "bg-purple-50", delay: 1 },
          { icon: Wifi, label: "Low Latency", value: "<5ms", color: "text-emerald-600", bg: "bg-emerald-50", delay: 2 },
          { icon: Shield, label: "Verified Network", value: "100%", color: "text-amber-600", bg: "bg-amber-50", delay: 3 },
        ].map(({ icon: Icon, label, value, color, bg, delay }) => (
          <div key={label} className="stat-glass stat-pop rounded-xl px-4 py-3 flex items-center gap-3" style={{ animationDelay: `${delay * 100 + 300}ms` }}>
            <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
              <div className="text-[11px] text-gray-500 leading-tight">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search and Filters ── */}
      <div className="animate-in bg-white rounded-xl shadow-md p-6 mb-8 search-glow transition-shadow" style={{ "--stagger": 3 } as React.CSSProperties}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by cafe name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === "all" ? "All Cities" : city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs font-medium text-gray-500 self-center mr-1">Type:</span>
          {([["all", "All"], ["pc", "🖥️ PC"], ["console", "🎮 Console"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSystemTypeFilter(val)}
              className={`filter-chip px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                systemTypeFilter === val
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 self-center mx-1" />
          <span className="text-xs font-medium text-gray-500 self-center mr-1">Price:</span>
          {([["all", "Any"], ["under100", "Under ₹100"], ["100to300", "₹100–300"], ["over300", "₹300+"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPriceFilter(val)}
              className={`filter-chip px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                priceFilter === val
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results count with live indicator ── */}
      <div className="animate-in flex items-center justify-between mb-4" style={{ "--stagger": 4 } as React.CSSProperties}>
        <p className="text-gray-600 font-medium">
          {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"} found
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
          <span className="live-dot" />
          <Zap className="w-3 h-3 text-green-500" />
          Real-time availability
        </div>
      </div>

      {/* ── Location controls ── */}
      <div className="animate-in flex flex-wrap items-center gap-2 mb-4" style={{ "--stagger": 4 } as React.CSSProperties}>
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="filter-chip flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {userLoc ? "Update my location" : "Use my location"}
        </button>
        <button
          onClick={() => setShowMap((v) => !v)}
          className="filter-chip flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <MapIcon className="w-4 h-4" /> {showMap ? "Hide map" : "Show map"}
        </button>
        {hasDistances && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="live-dot" /> Sorted by distance from you
          </span>
        )}
        {locError && <span className="text-xs text-amber-600">{locError}</span>}
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
          <p className="text-gray-500 text-lg font-medium">No cafes found matching your criteria</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or city filter</p>
        </div>
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
          <div className="hero-glow absolute rounded-full blur-3xl" style={{ width: 180, height: 180, background: "#60a5fa", opacity: 0.15, top: "-20%", right: "10%" }} />
          <div className="hero-glow absolute rounded-full blur-3xl" style={{ width: 120, height: 120, background: "#818cf8", opacity: 0.1, bottom: "-10%", left: "20%", animationDelay: "2s" }} />
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
  );
}
