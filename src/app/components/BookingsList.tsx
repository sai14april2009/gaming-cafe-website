import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Calendar, Users, DollarSign, Phone } from "lucide-react";

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
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });
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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              {new Date(booking.booking_date).toDateString()}
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
              <DollarSign className="w-4 h-4" />
              ${booking.total_price}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Users className="w-4 h-4" />
            {booking.party_size} {booking.party_size === 1 ? "player" : "players"}
          </div>

          <div className="border-t pt-3 space-y-2">
            {booking.players?.map((player: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{player.name}</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Phone className="w-3 h-3" />
                  {player.phone}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}