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
  // Parse as local midnight, never UTC, so the weekday/day is correct in IST.
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
      return "Cancelled by the cafe.";
    case "walkin_conflict_refund":
      return "Cancelled by the cafe.";
    case "customer_agreed_reschedule":
      return "Cancelled — you agreed to reschedule.";
    default:
      return "This booking was cancelled.";
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || "pending";
  const styles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-600",
    pending: "bg-yellow-100 text-yellow-700",
  };
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${styles[s] || styles.pending}`}>
      {label}
    </span>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const isCancelled = booking.status === "cancelled";
  const cafeName = booking.cafes?.name || "Cafe unavailable";
  const city = booking.cafes?.city;
  const systemName = booking.gaming_systems?.name || "System not specified";
  const strike = isCancelled ? "line-through" : "";

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 transition-shadow hover:shadow-md ${
        isCancelled ? "opacity-60" : ""
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className={`text-lg font-bold text-gray-900 truncate ${strike}`}>{cafeName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Monitor className="w-4 h-4 flex-shrink-0" />
                {systemName}
              </span>
              {city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {city}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className={`mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 ${strike}`}>
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-colors"
      >
        Browse cafes
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
      // Explicit user_id filter. RLS alone scopes a *pure* customer correctly, but a
      // user who is ALSO a cafe owner would additionally see their whole cafe's
      // bookings via the owner SELECT policy — wrong for a page called "My Bookings".
      // This filter is a strict subset of what RLS allows (so it can't leak anything)
      // and makes the page mean "bookings I personally made" for every role.
      const { data, error } = await supabase
        .from("bookings")
        .select("*, cafes (name, city), gaming_systems (name, type)")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });
      if (error) console.error(error);
      setBookings(data || []);
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  // Wait for auth to resolve before deciding — otherwise a refresh bounces a
  // signed-in user to /login.
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ returnTo: "/my-bookings" }} replace />;
  }

  const today = toLocalDateString(new Date());

  // Time-based split: a booking is "upcoming" while its slot hasn't ended,
  // regardless of status — so a cafe-cancelled future booking stays in Upcoming,
  // clearly flagged, which is what the customer most needs to see.
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Bookings</h1>
        <p className="text-gray-500 mt-1">View your gaming sessions and their status.</p>
      </div>

      {/* Segmented tabs */}
      <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6">
        {(["upcoming", "past"] as Tab[]).map((t) => {
          const count = t === "upcoming" ? upcoming.length : past.length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                active ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}
              <span className={`ml-2 ${active ? "text-blue-400" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

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
          {shown.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
