import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Calendar, Users, Clock, DollarSign, Phone, User } from "lucide-react";

interface BookingsListProps {
  cafeId: string;
}

export function BookingsList({ cafeId }: BookingsListProps) {
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
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setBookings(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bookings...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No bookings yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Bookings ({bookings.length})</h2>
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white rounded-xl shadow-md p-5">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{new Date(booking.booking_date).toDateString()}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              booking.status === "confirmed"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {booking.status || "pending"}
            </span>
          </div>

          {/* Booking details */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {booking.start_time} – {booking.end_time}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {booking.num_people} {booking.num_people === 1 ? "player" : "players"}
            </div>
            <div className="flex items-center gap-1 font-semibold text-purple-600">
              <DollarSign className="w-4 h-4" />
              ₹{booking.total_price}
            </div>
          </div>

          {/* System booked */}
          {booking.gaming_systems && (
            <div className="text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2">
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
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{player.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />
                      <span>{player.phone || "—"}</span>
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
      ))}
    </div>
  );
}