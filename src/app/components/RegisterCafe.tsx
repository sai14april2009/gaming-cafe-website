import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Store } from "lucide-react";
import { crossesMidnight } from "../utils/cafeHours";

// "HH:MM" -> "H:MM AM/PM" (leading zero stripped)
const formatTimeHint = (t: string) => {
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (h === 0) return `12:${m} AM`;
  if (h < 12) return `${h}:${m} AM`;
  if (h === 12) return `12:${m} PM`;
  return `${h - 12}:${m} PM`;
};

interface RegisterCafeProps {
  onRegistered: () => void;
}

export function RegisterCafe({ onRegistered }: RegisterCafeProps) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    description: "",
    city: "",
    address: "",
    phone: "",
    email: profile?.email || "",
    price_per_hour: "",
    open_time: "",
    close_time: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.city || !form.address || !form.price_per_hour) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const { data: newCafe, error: insertError } = await supabase
      .from("cafes")
      .insert({
        owner_id: user?.id,
        name: form.name,
        description: form.description,
        city: form.city,
        address: form.address,
        phone: form.phone,
        email: form.email,
        price_per_hour: parseFloat(form.price_per_hour),
        image_url: form.image_url,
        is_approved: false,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Seed cafe_hours with 7 uniform rows so the grid reads the same schedule
    // the owner just entered. If this fails the cafe still exists but has no
    // schedule; the next CafeEditor save will backfill it.
    if (newCafe?.id && form.open_time && form.close_time) {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        cafe_id: newCafe.id,
        day_of_week: i,
        open_time: form.open_time,
        close_time: form.close_time,
      }));
      const { error: hoursError } = await supabase.from("cafe_hours").insert(rows);
      if (hoursError) {
        console.warn("cafe_hours seed failed on register:", hoursError.message);
      }
    }

    onRegistered();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Register Your Cafe</h1>
          <p className="text-gray-500">Tell us about your gaming cafe to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cafe Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Pixel Paradise Gaming Lounge"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Tell players what makes your cafe special..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g. San Francisco"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price per Hour ($) *</label>
              <input
                type="number"
                step="0.01"
                value={form.price_per_hour}
                onChange={(e) => handleChange("price_per_hour", e.target.value)}
                placeholder="8"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Street address"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="10-digit number"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="cafe@example.com"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Time</label>
              <input
                type="time"
                value={form.open_time}
                onChange={(e) => handleChange("open_time", e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Closing Time</label>
              <input
                type="time"
                value={form.close_time}
                onChange={(e) => handleChange("close_time", e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
              {form.open_time && form.close_time && crossesMidnight(form.open_time, form.close_time) && (
                <p className="text-xs text-gray-500 mt-1">Closes at {formatTimeHint(form.close_time)} the next day</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Image URL</label>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-700"
          >
            {loading ? "Registering..." : "Register Cafe"}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Your cafe will be reviewed and approved before it appears publicly
          </p>
        </form>
      </div>
    </div>
  );
}