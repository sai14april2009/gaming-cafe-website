import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { IndianRupee, Calendar, Users, TrendingUp, Clock } from "lucide-react";
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
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const cards = [
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "from-green-500 to-emerald-600",
      bg: "bg-green-50",
      accent: "text-green-600",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50",
      accent: "text-blue-600",
    },
    {
      label: "Players Served",
      value: stats.totalPlayers,
      icon: Users,
      color: "from-violet-500 to-indigo-600",
      bg: "bg-violet-50",
      accent: "text-violet-600",
    },
    {
      label: "Upcoming",
      value: stats.upcomingBookings,
      icon: TrendingUp,
      color: "from-orange-500 to-red-500",
      bg: "bg-orange-50",
      accent: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="dash-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-default"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No bookings yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map((booking) => {
              // Recent list keeps ALL statuses (unlike the totals) so a cancellation
              // is visible when revenue dips — styled like BookingsList's cancelled rows.
              const isCancelled = booking.status === "cancelled";
              return (
                <div
                  key={booking.id}
                  className={`flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors ${isCancelled ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isCancelled ? "bg-red-400" : booking.status === "completed" ? "bg-green-400" : "bg-blue-400"
                    }`} />
                    <div className="min-w-0">
                      <p className={`font-medium text-sm text-gray-900 ${isCancelled ? "line-through" : ""}`}>
                        {new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {booking.start_time} – {booking.end_time}
                        </span>
                        <span>·</span>
                        <span>{booking.num_people} player{booking.num_people !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCancelled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-600">
                        cancelled
                      </span>
                    )}
                    {!isCancelled && booking.status && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        booking.status === "confirmed" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                      }`}>
                        {booking.status}
                      </span>
                    )}
                    <p className={`font-semibold text-sm tabular-nums ${isCancelled ? "line-through text-gray-400" : "text-gray-900"}`}>
                      ₹{booking.total_price}
                    </p>
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
