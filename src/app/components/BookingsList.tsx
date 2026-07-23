import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Calendar, Users, Clock, IndianRupee, Phone, User, ChevronDown, ChevronUp, Ban, AlertCircle } from "lucide-react";
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
  // Accordion: one booking's detail view open at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Which booking is mid-cancel, to disable its button while the write is in flight.
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  const handleCancel = async (booking: any) => {
    const name = booking.players?.[0]?.name || "the customer";
    if (
      !window.confirm(
        `Cancel this booking for ${name}?\n\n` +
          `${booking.start_time}–${booking.end_time} on ${new Date(booking.booking_date).toDateString()}\n` +
          `₹${booking.total_price} will need to be refunded to the customer manually.`
      )
    )
      return;

    setCancellingId(booking.id);
    // Same error-handling shape as SystemsManager's cancel flow: .select() lets us
    // tell a real failure (thrown error) from an RLS block (0 rows changed) — never
    // a silent failure. "cancelled" frees the slot (RPC + overlap constraint both
    // filter status='confirmed'); cancellation_reason marks it owner-initiated.
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: "owner_cancelled" })
      .eq("id", booking.id)
      .select();
    setCancellingId(null);

    if (error) {
      alert(`Could not cancel the booking: ${error.message}\n\nThe booking is unchanged.`);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Could not cancel the booking — the update was blocked (0 rows changed).\n\n" +
          "This usually means the cafe owner lacks UPDATE permission on the bookings table (Row-Level Security).\n\n" +
          "The booking is unchanged."
      );
      return;
    }

    // Merge the authoritative updated row into local state — no refetch, so no
    // loading flash. data[0] carries the new status/reason; spreading it over the
    // existing row preserves the joined gaming_systems (which .select() omits).
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, ...data[0] } : b)));
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
          const isExpanded = expandedId === booking.id;
          // Only a confirmed booking can be cancelled, and only from the Advanced
          // tab (History is a read-only archive of days already past).
          const canCancel = mode === "advanced" && booking.status === "confirmed";
          const primary = booking.players?.[0];
          return (
            <div
              key={booking.id}
              className={`bg-white rounded-xl shadow-md transition-opacity ${isCancelled ? "opacity-60" : ""}`}
            >
              {/* Summary row — click to expand into the full detail view */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                aria-expanded={isExpanded}
                className="w-full text-left p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    <span className={`font-semibold text-sm ${isCancelled ? "line-through" : ""}`}>
                      {new Date(booking.booking_date).toDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isCancelled
                        ? "bg-red-100 text-red-600"
                        : booking.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {booking.status || "pending"}
                    </span>
                  </div>
                  <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 ${isCancelled ? "line-through" : ""}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      {booking.start_time} – {booking.end_time}
                    </span>
                    {booking.gaming_systems && (
                      <span className="flex items-center gap-1">
                        🖥️ <span className="font-medium">{booking.gaming_systems.name}</span>
                        <span className="text-gray-400">({booking.gaming_systems.type})</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      {booking.num_people} {booking.num_people === 1 ? "player" : "players"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`flex items-center gap-1 font-semibold text-purple-600 ${isCancelled ? "line-through" : ""}`}>
                    <IndianRupee className="w-4 h-4 flex-shrink-0" />
                    {booking.total_price}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {/* Expanded detail view */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-4 border-t border-gray-100 space-y-4">
                  {/* Player details */}
                  {primary ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Player Details
                      </p>
                      <div className="space-y-2">
                        {booking.players.map((player: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <span className="font-medium">{player.name || "—"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span>{player.phone || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No player details recorded</p>
                  )}

                  {/* Refund reminder — shown for any cancelled booking, so it persists
                      when the card is re-opened, not just right after cancelling. */}
                  {isCancelled && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Remember to refund <span className="font-semibold">₹{booking.total_price}</span> to{" "}
                        <span className="font-semibold">{primary?.name || "the customer"}</span>
                        {" "}({primary?.phone || "no phone on file"}) — refunds are handled manually
                        outside the app in Phase 1.
                      </span>
                    </div>
                  )}

                  {/* Cancel action — confirmed bookings only, Advanced tab only */}
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(booking)}
                      disabled={cancellingId === booking.id}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-red-400 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Ban className="w-4 h-4" />
                      {cancellingId === booking.id ? "Cancelling…" : "Cancel Booking"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
