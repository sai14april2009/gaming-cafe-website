import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router";
import { supabase } from "../../supabase";
import { useAuth } from "../context/AuthContext";
import { toLocalDateString } from "../utils/date";
import {
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Ban,
  Ticket,
  MapPin,
  Monitor,
  Gamepad2,
  ArrowRight,
} from "lucide-react";

type Tab = "upcoming" | "past";

// Local "HH:MM" (24h) for comparing against a booking's stored times.
function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
}

// A slot has ended when its day is past, or it's today and the end time has passed.
function hasEnded(booking: any, today: string): boolean {
  if (booking.booking_date < today) return true;
  if (booking.booking_date === today) return booking.end_time <= nowHHMM();
  return false;
}

function to12h(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Customer-facing wording — never surface the raw enum.
function cancellationText(reason: string | null): string {
  switch (reason) {
    case "owner_cancelled":
    case "walkin_conflict_refund":
      return "Cancelled by the cafe — refund pending.";
    case "customer_agreed_reschedule":
      return "Cancelled — you agreed to reschedule.";
    default:
      return "This booking was cancelled.";
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || "pending";
  const styles: Record<string, { bg: string; dot: string }> = {
    confirmed: { bg: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
    completed: { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
    cancelled: { bg: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
    pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  };
  const { bg, dot } = styles[s] || styles.pending;
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function SystemSpecs({ system }: { system: any }) {
  if (!system) return null;
  const systemName = system.name || "System not specified";
  const isPC = system.type === "PC";

  const specs: { label: string; value: string }[] = [];
  if (isPC) {
    if (system.gpu) specs.push({ label: "GPU", value: system.gpu });
    if (system.cpu) specs.push({ label: "CPU", value: system.cpu });
    if (system.ram) specs.push({ label: "RAM", value: system.ram });
  } else {
    if (system.console) specs.push({ label: "Console", value: system.console });
  }

  return (
    <div className="mt-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center gap-2">
        {isPC ? (
          <Monitor className="w-4 h-4 text-blue-500 flex-shrink-0" />
        ) : (
          <Gamepad2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
        )}
        <span className="font-semibold text-sm text-gray-900">{systemName}</span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          isPC
            ? "bg-blue-100 text-blue-600"
            : "bg-purple-100 text-purple-600"
        }`}>
          {system.type || "—"}
        </span>
      </div>
      {specs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {specs.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600"
            >
              <span className="font-medium text-gray-500">{s.label}:</span>
              {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const isCancelled = booking.status === "cancelled";
  const cafeName = booking.cafes?.name || "Cafe unavailable";
  const city = booking.cafes?.city;
  const strike = isCancelled ? "line-through" : "";

  return (
    <div
      className={`dash-card bg-white rounded-xl border border-gray-200 overflow-hidden ${
        isCancelled ? "opacity-60" : ""
      }`}
    >
      <div className="p-5">
        {/* Header: cafe name + status */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to={`/cafe/db/${booking.cafe_id}`}
              className={`group inline-flex items-center gap-1.5 ${strike}`}
            >
              <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {cafeName}
              </h3>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
            {city && (
              <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {city}
              </div>
            )}
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* System specs panel */}
        <SystemSpecs system={booking.gaming_systems} />

        {/* Booking details */}
        <div className={`mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 ${strike}`}>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
            {formatDate(booking.booking_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
            {to12h(booking.start_time)} – {to12h(booking.end_time)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
            {booking.num_people} {booking.num_people === 1 ? "player" : "players"}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-blue-600">
            <IndianRupee className="w-4 h-4 flex-shrink-0" />
            {booking.total_price}
          </span>
        </div>

        {isCancelled && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
            <Ban className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{cancellationText(booking.cancellation_reason)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-2/5" />
          <div className="skeleton h-3.5 w-1/4" />
        </div>
        <div className="skeleton h-6 w-20 !rounded-full" />
      </div>
      <div className="skeleton h-[68px] w-full mt-3 !rounded-lg" />
      <div className="mt-3 flex gap-4">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-4 w-20" />
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="animate-in bg-white rounded-xl border border-gray-200 p-12 text-center" style={{ "--stagger": 0 } as React.CSSProperties}>
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Ticket className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        {tab === "upcoming" ? "No upcoming bookings" : "No past bookings yet"}
      </h3>
      <p className="text-gray-500 mt-1 mb-6">
        {tab === "upcoming"
          ? "When you book a gaming session, it'll show up here."
          : "Your completed and past sessions will appear here."}
      </p>
      <Link
        to="/"
        className="auth-btn inline-flex items-center gap-2 !w-auto px-6 py-2.5 text-sm"
      >
        Browse cafes
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*, cafes (name, city), gaming_systems (name, type, gpu, cpu, ram, console)")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });
      if (error) console.error(error);
      setBookings(data || []);
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64 mb-6" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ returnTo: "/my-bookings" }} replace />;
  }

  const today = toLocalDateString(new Date());

  const upcoming = bookings
    .filter((b) => !hasEnded(b, today))
    .sort((a, b) =>
      a.booking_date !== b.booking_date
        ? a.booking_date.localeCompare(b.booking_date)
        : a.start_time.localeCompare(b.start_time)
    );
  const past = bookings
    .filter((b) => hasEnded(b, today))
    .sort((a, b) =>
      a.booking_date !== b.booking_date
        ? b.booking_date.localeCompare(a.booking_date)
        : b.start_time.localeCompare(a.start_time)
    );

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="animate-in mb-6" style={{ "--stagger": 0 } as React.CSSProperties}>
        <h1 className="text-3xl font-bold text-gray-900">Your Bookings</h1>
        <p className="text-gray-500 mt-1">View your gaming sessions and their status.</p>
      </div>

      {/* Pill tabs */}
      <div className="animate-in mb-6" style={{ "--stagger": 1 } as React.CSSProperties}>
        <div className="inline-flex bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
          {(["upcoming", "past"] as Tab[]).map((t) => {
            const count = t === "upcoming" ? upcoming.length : past.length;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t === "upcoming" ? "Upcoming" : "Past"}
                <span className={`ml-2 tabular-nums ${active ? "text-blue-200" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
          {shown.map((b, i) => (
            <div
              key={b.id}
              className="animate-in"
              style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
            >
              <BookingCard booking={b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
