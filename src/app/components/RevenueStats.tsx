import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react";

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
      const totalRevenue = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const totalPlayers = data.reduce((sum, b) => sum + (b.party_size || 0), 0);
      const now = new Date();
      const upcomingBookings = data.filter(
        (b) => new Date(b.booking_date) >= now
      ).length;

      setStats({
        totalRevenue,
        totalBookings: data.length,
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
      value: `$${stats.totalRevenue}`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "from-purple-500 to-pink-600",
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
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm">{new Date(booking.booking_date).toDateString()}</p>
                  <p className="text-xs text-gray-500">{booking.party_size} player{booking.party_size !== 1 ? "s" : ""}</p>
                </div>
                <p className="font-bold text-purple-600">${booking.total_price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}