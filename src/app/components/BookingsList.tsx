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

function slotEndDateTime(bookingDate: string, endTime: string): Date {
  return new Date(`${bookingDate}T${endTime}:00`);
}

export function BookingsList({ cafeId, mode }: BookingsListProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [cafeId]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        gaming_systems (name, type)
      `)
      .eq("cafe_id", cafeId);
    if (error) console.error(error);
    setBookings(data || []);
    setLoading(false);
  };

  const today = toToday();
  const now = new Date();

  const filtered = (bookings || []).filter((b) => {
    if (mode === "advanced") {
      return b.booking_date === today;
    }
    // history: slot has ended (booking_date + end_time < now)
    return slotEndDateTime(b.booking_date, b.end_time) < now;
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

  const heading = mode === "advanced" ? "Today's Advance Bookings" : "Booking History";
  const emptyText = mode === "advanced" ? "No advance bookings for today" : "No completed bookings yet";

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bookings...</div>;
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{heading} ({sorted.length})</h2>
      {sorted.map((booking) => {
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
      })}
    </div>
  );
}
