import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Store } from "lucide-react";

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
    opening_time: "",
    closing_time: "",
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
    const { error: insertError } = await supabase.from("cafes").insert({
      owner_id: user?.id,
      name: form.name,
      description: form.description,
      city: form.city,
      address: form.address,
      phone: form.phone,
      email: form.email,
      price_per_hour: parseFloat(form.price_per_hour),
      opening_time: form.opening_time,
      closing_time: form.closing_time,
      image_url: form.image_url,
      is_approved: false,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onRegistered();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-purple-600" />
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="cafe@example.com"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Time</label>
              <input
                type="time"
                value={form.opening_time}
                onChange={(e) => handleChange("opening_time", e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Closing Time</label>
              <input
                type="time"
                value={form.closing_time}
                onChange={(e) => handleChange("closing_time", e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Image URL</label>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
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
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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