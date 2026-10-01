import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabase";
import { Navigate, Link } from "react-router";
import { CounterMode } from "./CounterMode";
import { LayoutDashboard } from "lucide-react";

// Standalone home for Counter Mode — reachable from the header beside Dashboard.
// Owns the same auth + cafe fetch Dashboard does, then hands off to CounterMode.
export function CounterPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [cafe, setCafe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cafes")
        .select("id, price_per_hour, name")
        .eq("owner_id", user.id)
        .maybeSingle();
      setCafe(data);
      setLoading(false);
    })();
  }, [user?.id]);

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (profile?.role !== "owner") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500">The Counter is for cafe owners only.</p>
        </div>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold mb-2">No cafe yet</h1>
        <p className="text-gray-500 mb-5">Register your cafe from the dashboard to start seating walk-ins.</p>
        <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{cafe.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Front-desk counter</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </div>
      <CounterMode cafeId={cafe.id} pricePerHour={cafe.price_per_hour} />
    </div>
  );
}
