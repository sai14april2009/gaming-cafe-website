import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabase";
import { Navigate } from "react-router";
import { RegisterCafe } from "./RegisterCafe";
import { CafeEditor } from "./CafeEditor";
import { SystemsManager } from "./SystemsManager";
import { LiveSessions } from "./LiveSessions";
import { BookingsList } from "./BookingsList";
import { RepairSlotsManager } from "./RepairSlotsManager";
import { RevenueStats } from "./RevenueStats";
import { BarChart3, Settings, Monitor, Radio, History } from "lucide-react";

export function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [cafe, setCafe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "systems" | "live" | "bookings">("overview");

  useEffect(() => {
    if (!user) return;
    fetchCafe();
  }, [user]);

  const fetchCafe = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cafes")
      .select("*")
      .eq("owner_id", user?.id)
      .maybeSingle();
    setCafe(data);
    setLoading(false);
  };

  // Same fetch, but without the full-page loading state — used to refresh cafe
  // data after an in-place edit (e.g. CafeEditor save) so the editing component
  // doesn't get unmounted mid-save and lose its own local state (success banner).
  const refreshCafe = async () => {
    const { data } = await supabase
      .from("cafes")
      .select("*")
      .eq("owner_id", user?.id)
      .maybeSingle();
    setCafe(data);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Skeleton header */}
          <div className="skeleton h-8 w-48 mb-3" />
          <div className="skeleton h-5 w-32 mb-6" />
          {/* Skeleton tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 pb-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 w-24" />)}
          </div>
          {/* Skeleton stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
          {/* Skeleton content */}
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (profile?.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500">This dashboard is for cafe owners only.</p>
        </div>
      </div>
    );
  }

  if (!cafe) {
    return <RegisterCafe onRegistered={fetchCafe} />;
  }

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "details" as const, label: "Cafe Details", icon: Settings },
    { key: "systems" as const, label: "Gaming Systems", icon: Monitor },
    { key: "live" as const, label: "Live Now", icon: Radio },
    { key: "bookings" as const, label: "Booking History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{cafe.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              {cafe.is_approved ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Pending Approval
                </span>
              )}
              {cafe.city && <span className="text-sm text-gray-400">·</span>}
              {cafe.city && <span className="text-sm text-gray-500">{cafe.city}</span>}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative flex gap-1 mb-6 bg-white rounded-xl shadow-sm p-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isLive = tab.key === "live";
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {isLive && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
                {isLive && isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-300" />
                )}
                {!isLive && <Icon className="w-4 h-4" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <RevenueStats cafeId={cafe.id} />}
        {activeTab === "details" && <CafeEditor cafe={cafe} onUpdated={refreshCafe} />}
        {activeTab === "systems" && (
          <SystemsManager
            cafeId={cafe.id}
            pricePerHour={cafe.price_per_hour}
          />
        )}
        {activeTab === "live" && (
          <LiveSessions cafeId={cafe.id} pricePerHour={cafe.price_per_hour} />
        )}
        {activeTab === "bookings" && (
          <>
            <BookingsList cafeId={cafe.id} />
            <RepairSlotsManager cafeId={cafe.id} />
          </>
        )}
      </div>
    </div>
  );
}