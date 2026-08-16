import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Search, SlidersHorizontal, Star, MapPin, Monitor, Gamepad2,
  Cpu, Zap, ChevronRight, Flame, Trophy, Swords, Target,
} from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "../../supabase";

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
}

/* ── Hero slides — gaming motivation posters ── */

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
];

const GAMING_QUOTES = [
  "🎮 \"The game is never over until it's over.\" — Yogi Berra",
  "⚔️ \"Winners never quit and quitters never win.\"",
  "🏆 \"It's not about the graphics, it's about the gameplay.\"",
  "🔥 \"Lag is temporary. Glory is forever.\"",
  "💎 \"GG doesn't mean the end — it means respect.\"",
  "🎯 \"In the world of gaming, the only limit is your imagination.\"",
  "⭐ \"Practice isn't the thing you do once you're good. It's the thing that makes you good.\"",
  "🕹️ \"Every pro was once a noob.\"",
];

/* ── Component ── */

export function BrowseCafes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [dbCafes, setDbCafes] = useState<DbCafe[]>([]);
  const [systems, setSystems] = useState<DbSystem[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroDir, setHeroDir] = useState<"enter" | "exit">("enter");

  /* Fetch cafes + their gaming systems */
  useEffect(() => {
    (async () => {
      const [{ data: cafesData }, { data: sysData }] = await Promise.all([
        supabase
          .from("cafes")
          .select("id, name, description, city, address, price_per_hour, image_url, is_approved")
          .eq("is_approved", true),
        supabase
          .from("gaming_systems")
          .select("id, cafe_id, name, type, gpu, cpu, ram, console"),
      ]);
      if (cafesData) setDbCafes(cafesData as DbCafe[]);
      if (sysData) setSystems(sysData as DbSystem[]);
    })();
  }, []);

  /* Auto-rotate hero carousel every 5s */
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

  const filteredCafes = dbCafes.filter((cafe) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      cafe.name.toLowerCase().includes(q) ||
      cafe.address.toLowerCase().includes(q) ||
      cafe.city.toLowerCase().includes(q);
    const matchesCity = selectedCity === "all" || cafe.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const slide = HERO_SLIDES[heroIdx];
  const SlideIcon = slide.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── Hero Carousel ── */}
      <div className="animate-in mb-8 relative" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ minHeight: 280 }}
        >
          {/* Background image + gradient overlay */}
          <div
            className={heroDir === "enter" ? "hero-slide-enter" : "hero-slide-exit"}
            key={heroIdx}
            style={{ position: "absolute", inset: 0 }}
          >
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0" style={{ background: slide.overlay }} />
            {/* Decorative glow orbs */}
            <div
              className="hero-glow absolute rounded-full blur-3xl"
              style={{
                width: 200, height: 200,
                background: slide.accent,
                opacity: 0.2,
                top: "10%", right: "15%",
              }}
            />
            <div
              className="hero-glow absolute rounded-full blur-3xl"
              style={{
                width: 150, height: 150,
                background: slide.accent,
                opacity: 0.12,
                bottom: "10%", left: "10%",
                animationDelay: "3s",
              }}
            />
          </div>

          {/* Content */}
          <div
            className={`relative z-10 flex items-center p-8 md:p-12 ${heroDir === "enter" ? "hero-slide-enter" : "hero-slide-exit"}`}
            key={`c-${heroIdx}`}
            style={{ minHeight: 280 }}
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: slide.accent }}
              >
                Browse Cafes <ChevronRight className="w-4 h-4" />
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

      {/* ── Gaming quotes marquee ── */}
      <div className="animate-in mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 py-3" style={{ "--stagger": 1 } as React.CSSProperties}>
        <div className="marquee-track flex whitespace-nowrap gap-12" style={{ width: "max-content" }}>
          {[...GAMING_QUOTES, ...GAMING_QUOTES].map((q, i) => (
            <span key={i} className="text-sm text-gray-300 font-medium">{q}</span>
          ))}
        </div>
      </div>

      {/* ── Search and Filters ── */}
      <div className="animate-in bg-white rounded-xl shadow-md p-6 mb-8" style={{ "--stagger": 2 } as React.CSSProperties}>
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
            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === "all" ? "All Cities" : city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="animate-in flex items-center justify-between mb-4" style={{ "--stagger": 3 } as React.CSSProperties}>
        <p className="text-gray-600">
          {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"} found
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Zap className="w-3 h-3" /> Real-time availability
        </div>
      </div>

      {/* ── Cafes Grid ── */}
      <div id="cafe-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCafes.map((cafe, idx) => {
          const cafeSystems = systemsForCafe(cafe.id);
          const pcCount = cafeSystems.filter((s) => s.type === "PC").length;
          const consoleCount = cafeSystems.filter((s) => s.type === "Console").length;
          // Pick one highlight GPU/console to show
          const highlightGpu = cafeSystems.find((s) => s.gpu)?.gpu;
          const highlightConsole = cafeSystems.find((s) => s.console)?.console;

          return (
            <Link
              key={cafe.id}
              to={`/cafe/db/${cafe.id}`}
              className="animate-in cafe-card group block bg-white rounded-xl overflow-hidden shadow-sm"
              style={{ "--stagger": 4 + idx } as React.CSSProperties}
            >
              {/* Image with overlay */}
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                {cafe.image_url ? (
                  <img
                    src={cafe.image_url}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    <span className="font-bold text-base text-gray-900">₹{cafe.price_per_hour}</span>
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
              </div>

              {/* Card body — specs */}
              <div className="p-4">
                {/* Description */}
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{cafe.description}</p>

                {/* System spec chips */}
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
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCafes.length === 0 && (
        <div className="text-center py-16">
          <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No cafes found matching your criteria</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or city filter</p>
        </div>
      )}
    </div>
  );
}
