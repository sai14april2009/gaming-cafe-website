import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Calendar, Users, Clock, IndianRupee, Phone, User, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { toLocalDateString } from "../utils/date";

interface BookingsListProps {
  cafeId: string;
}

function toToday(): string {
  // Local day, not UTC — matches how booking_date is stored (see utils/date.ts).
  return toLocalDateString(new Date());
}

// How many past bookings the History tab loads at once.
const HISTORY_LIMIT = 200;

// Booking History: a read-only archive of days already past. Future/today bookings
// live in the date-aware Gaming Systems grid (the Advanced Booking tab was merged
// there), so this component no longer has an "advanced" mode.
export function BookingsList({ cafeId }: BookingsListProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Accordion: one booking's detail view open at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [cafeId]);

  const fetchBookings = async () => {
    setLoading(true);
    const todayStr = toToday();

    // Scope the query to what this tab renders — strictly past days, capped. This
    // previously pulled every booking the cafe had ever taken and filtered in the
    // browser, which silently truncates at PostgREST's default 1000-row cap.
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        gaming_systems (name, type)
      `)
      .eq("cafe_id", cafeId)
      .lt("booking_date", todayStr)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error) console.error(error);
    setBookings(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bookings...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Booking History ({bookings.length})</h2>

      {bookings.length >= HISTORY_LIMIT && (
        <p className="-mt-2 text-xs text-gray-500">
          Showing the {HISTORY_LIMIT} most recent bookings.
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No completed bookings yet</p>
        </div>
      ) : (
        bookings.map((booking) => {
          const isCancelled = booking.status === "cancelled";
          const isExpanded = expandedId === booking.id;
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
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
