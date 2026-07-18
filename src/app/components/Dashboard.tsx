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

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{cafe.name}</h1>
        <p className="text-gray-500 mb-6">
          {cafe.is_approved ? "✅ Approved & Live" : "⏳ Pending Approval"}
        </p>

        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "details", label: "Cafe Details" },
            { key: "systems", label: "Gaming Systems" },
            { key: "live", label: "🔴 Live Now" },
            { key: "bookings", label: "Bookings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <RevenueStats cafeId={cafe.id} />}
        {activeTab === "details" && <CafeEditor cafe={cafe} onUpdated={fetchCafe} />}
        {activeTab === "systems" && (
          <SystemsManager
            cafeId={cafe.id}
            pricePerHour={cafe.price_per_hour}
            openingTime={cafe.opening_time}
            closingTime={cafe.closing_time}
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