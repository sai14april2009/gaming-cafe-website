import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { IndianRupee, Calendar, Users, TrendingUp } from "lucide-react";
import { toLocalDateString } from "../utils/date";

interface RevenueStatsProps {
  cafeId: string;
}

export function RevenueStats({ cafeId }: RevenueStatsProps) {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalPlayers: 0,
    upcomingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [cafeId]);

  const fetchStats = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false });

    if (data) {
      // Cancelled bookings were never paid, so they must not count toward revenue,
      // booking totals, or players served. pending/null aren't committed money either,
      // so an allowlist (not a `!== "cancelled"` denylist) is the safe filter — it
      // also excludes null status without special-casing.
      const COUNTS_AS_REVENUE = ["confirmed", "completed"];
      const countable = data.filter((b) => COUNTS_AS_REVENUE.includes(b.status));

      const totalRevenue = countable.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const totalPlayers = countable.reduce((sum, b) => sum + (b.num_people || 0), 0);

      // Upcoming = a confirmed booking whose slot hasn't started yet. Compare on the
      // LOCAL day: booking_date is a local "YYYY-MM-DD" and start_time a zero-padded
      // "HH:MM", so both compare lexicographically. The old `new Date(booking_date) >= now`
      // parsed the date as UTC midnight, which in IST dropped every later-today booking.
      const now = new Date();
      const today = toLocalDateString(now);
      const nowHHMM = now.toTimeString().slice(0, 5); // local "HH:MM"
      const upcomingBookings = data.filter(
        (b) =>
          b.status === "confirmed" &&
          (b.booking_date > today ||
            (b.booking_date === today && b.start_time > nowHHMM))
      ).length;

      setStats({
        totalRevenue,
        totalBookings: countable.length,
        totalPlayers,
        upcomingBookings,
      });
      setRecentBookings(data.slice(0, 5));
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading stats...</div>;
  }

  const cards = [
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue}`,
      icon: IndianRupee,
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Total Players Served",
      value: stats.totalPlayers,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Upcoming Bookings",
      value: stats.upcomingBookings,
      icon: TrendingUp,
      color: "from-orange-500 to-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-md p-5">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold mb-4">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No bookings yet</p>
        ) : (
          <div className="space-y-3">
            {recentBookings.map((booking) => {
              // Recent list keeps ALL statuses (unlike the totals) so a cancellation
              // is visible when revenue dips — styled like BookingsList's cancelled rows.
              const isCancelled = booking.status === "cancelled";
              return (
                <div
                  key={booking.id}
                  className={`flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0 ${isCancelled ? "opacity-60" : ""}`}
                >
                  <div>
                    <p className="font-medium text-sm">{new Date(booking.booking_date).toDateString()}</p>
                    <p className="text-xs text-gray-500">{booking.num_people} player{booking.num_people !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCancelled && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        cancelled
                      </span>
                    )}
                    <p className={`font-bold text-blue-600 ${isCancelled ? "line-through" : ""}`}>₹{booking.total_price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}