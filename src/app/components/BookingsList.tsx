import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Calendar, Users, Clock, IndianRupee, Phone, User } from "lucide-react";
import { toLocalDateString } from "../utils/date";

interface BookingsListProps {
  cafeId: string;
  mode: "advanced" | "history";
}

function toToday(): string {
  // Local day, not UTC — matches how booking_date is stored (see utils/date.ts).
  return toLocalDateString(new Date());
}

// How many past bookings the History tab loads at once.
const HISTORY_LIMIT = 200;

function formatDateShort(date: Date) {
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    dateNum: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

export function BookingsList({ cafeId, mode }: BookingsListProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // The Advanced tab is day-scoped: the owner picks which of the next 7 days to
  // view. Without this, bookings for tomorrow onward were invisible everywhere in
  // the dashboard (Booking History only shows slots that have already ended).
  const [selectedDate, setSelectedDate] = useState<string>(toToday());

  useEffect(() => {
    fetchBookings();
  }, [cafeId, mode]);

  const fetchBookings = async () => {
    setLoading(true);
    const todayStr = toToday();

    // Scope the query to what each tab actually renders. This previously pulled
    // every booking the cafe had ever taken and filtered in the browser, which
    // silently truncates at PostgREST's default 1000-row cap once a cafe gets busy.
    let query = supabase
      .from("bookings")
      .select(`
        *,
        gaming_systems (name, type)
      `)
      .eq("cafe_id", cafeId);

    if (mode === "advanced") {
      const lastDay = new Date();
      lastDay.setDate(lastDay.getDate() + 6);
      query = query
        .gte("booking_date", todayStr)
        .lte("booking_date", toLocalDateString(lastDay));
    } else {
      query = query
        .lt("booking_date", todayStr)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(HISTORY_LIMIT);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    setBookings(data || []);
    setLoading(false);
  };

  const today = toToday();

  // Today .. today+6, matching the customer-facing booking window.
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  // Per-day count so the owner can spot which days have bookings without having
  // to click through all 7 — that discoverability gap is what hid these before.
  const countForDate = (dateStr: string) =>
    (bookings || []).filter(
      (b) => b.booking_date === dateStr && b.status !== "cancelled"
    ).length;

  const filtered = (bookings || []).filter((b) => {
    if (mode === "advanced") {
      return b.booking_date === selectedDate;
    }
    // history: strictly earlier days. Today is covered by the Advanced tab's day
    // picker, so scoping history to past days stops a booking that finished today
    // from being listed in both tabs at the same time.
    return b.booking_date < today;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (mode === "advanced") {
      return a.start_time.localeCompare(b.start_time);
    }
    // history: most recent date first, then start_time desc within same date
    if (b.booking_date !== a.booking_date) {
      return b.booking_date.localeCompare(a.booking_date);
    }
    return b.start_time.localeCompare(a.start_time);
  });

  const selectedDayLabel = (() => {
    if (selectedDate === today) return "Today";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate === toLocalDateString(tomorrow)) return "Tomorrow";
    // Parse as local midnight (not UTC) so the label shows the right day.
    return new Date(`${selectedDate}T00:00:00`).toDateString();
  })();

  const heading = mode === "advanced" ? selectedDayLabel : "Booking History";
  const emptyText =
    mode === "advanced"
      ? `No bookings for ${selectedDayLabel.toLowerCase()}`
      : "No completed bookings yet";

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bookings...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Day selector — Advanced tab only. Always rendered (even on empty days)
          so the owner can always navigate to another day. */}
      {mode === "advanced" && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex items-center gap-0 overflow-x-auto">
            {next7Days.map((date, index) => {
              const dateStr = toLocalDateString(date);
              const { day, dateNum, month } = formatDateShort(date);
              const isSelected = dateStr === selectedDate;
              const count = countForDate(dateStr);
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex-shrink-0 px-5 py-3 flex flex-col items-center justify-center min-w-[84px] transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } ${index !== 0 ? "border-l border-gray-200" : ""}`}
                >
                  <div className="text-xs font-medium">{day}</div>
                  <div className="text-2xl font-bold my-0.5">{dateNum}</div>
                  <div className="text-[10px] font-medium">{month}</div>
                  <span
                    className={`mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      count === 0
                        ? "opacity-0"
                        : isSelected
                        ? "bg-white text-purple-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold">
        {heading} ({sorted.length})
      </h2>

      {mode === "history" && sorted.length >= HISTORY_LIMIT && (
        <p className="-mt-2 text-xs text-gray-500">
          Showing the {HISTORY_LIMIT} most recent bookings.
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{emptyText}</p>
        </div>
      ) : (
        sorted.map((booking) => {
          const isCancelled = booking.status === "cancelled";
          return (
            <div
              key={booking.id}
              className={`bg-white rounded-xl shadow-md p-5 transition-opacity ${isCancelled ? "opacity-60" : ""}`}
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className={`flex items-center gap-2 text-sm text-gray-600 ${isCancelled ? "line-through" : ""}`}>
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold">{new Date(booking.booking_date).toDateString()}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isCancelled
                    ? "bg-red-100 text-red-600"
                    : booking.status === "confirmed"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {booking.status || "pending"}
                </span>
              </div>

              {/* Booking details */}
              <div className={`flex flex-wrap gap-4 text-sm text-gray-600 mb-4 ${isCancelled ? "line-through" : ""}`}>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  {booking.start_time} – {booking.end_time}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {booking.num_people} {booking.num_people === 1 ? "player" : "players"}
                </div>
                <div className="flex items-center gap-1 font-semibold text-purple-600">
                  <IndianRupee className="w-4 h-4 flex-shrink-0" />
                  {booking.total_price}
                </div>
              </div>

              {/* System booked */}
              {booking.gaming_systems && (
                <div className={`text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2 ${isCancelled ? "line-through" : ""}`}>
                  🖥️ <span className="font-semibold">{booking.gaming_systems.name}</span>
                  <span className="text-gray-400 ml-1">({booking.gaming_systems.type})</span>
                </div>
              )}

              {/* Player details */}
              {booking.players && booking.players.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Player Details
                  </p>
                  <div className="space-y-2">
                    {booking.players.map((player: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className={`font-medium ${isCancelled ? "line-through" : ""}`}>{player.name || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className={isCancelled ? "line-through" : ""}>{player.phone || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No player info fallback */}
              {(!booking.players || booking.players.length === 0) && (
                <div className="border-t pt-3 text-sm text-gray-400 italic">
                  No player details recorded
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
