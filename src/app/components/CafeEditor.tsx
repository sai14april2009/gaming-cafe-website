import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { X, Plus, Search, Loader2 } from "lucide-react";

const AMENITY_SUGGESTIONS = [
  "High-speed WiFi", "Food & Drinks", "Private Rooms", "Tournament Area",
  "Streaming Setup", "Coaching Available", "24/7 Access", "Party Rooms",
  "Kids Area", "Birthday Parties", "Study Area", "Concierge Service",
  "Premium Food & Drinks", "VR Zone",
];

interface SteamGame {
  id: number;
  name: string;
  tiny_image?: string;
}

interface CafeEditorProps {
  cafe: any;
  onUpdated: () => void;
}

export function CafeEditor({ cafe, onUpdated }: CafeEditorProps) {
  const [form, setForm] = useState({
    name: cafe.name || "",
    description: cafe.description || "",
    city: cafe.city || "",
    address: cafe.address || "",
    phone: cafe.phone || "",
    email: cafe.email || "",
    price_per_hour: cafe.price_per_hour?.toString() || "",
    opening_time: cafe.opening_time || "",
    closing_time: cafe.closing_time || "",
    image_url: cafe.image_url || "",
  });
  const [amenities, setAmenities] = useState<string[]>(cafe.amenities || []);
  const [games, setGames] = useState<string[]>(cafe.games || []);
  const [customAmenity, setCustomAmenity] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Steam search state
  const [gameSearch, setGameSearch] = useState("");
  const [steamResults, setSteamResults] = useState<SteamGame[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchSteam = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSteamResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
  `https://corsproxy.io/?url=${encodeURIComponent(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`)}`
);
      const data = await res.json();
      const items: SteamGame[] = (data.items || []).slice(0, 8).map((item: any) => ({
        id: item.id,
        name: item.name,
        tiny_image: item.tiny_image,
      }));
      setSteamResults(items);
      setShowDropdown(items.length > 0);
    } catch {
      setSteamResults([]);
    }
    setSearchLoading(false);
  };

  const handleGameSearchChange = (value: string) => {
    setGameSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchSteam(value), 400);
  };

  const addGame = (gameName: string) => {
    if (!games.includes(gameName)) {
      setGames((prev) => [...prev, gameName]);
      setSuccess(false);
    }
    setGameSearch("");
    setSteamResults([]);
    setShowDropdown(false);
  };

  const removeGame = (game: string) => {
    setGames((prev) => prev.filter((g) => g !== game));
    setSuccess(false);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
    setSuccess(false);
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
      setCustomAmenity("");
      setSuccess(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("cafes")
      .update({
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
        amenities,
        games,
      })
      .eq("id", cafe.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      onUpdated();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-2">Cafe Details</h2>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Cafe Name</label>
        <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
        <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)}
          rows={3} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
          <input type="text" value={form.city} onChange={(e) => handleChange("city", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Price per Hour ($)</label>
          <input type="number" step="0.01" value={form.price_per_hour} onChange={(e) => handleChange("price_per_hour", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
        <input type="text" value={form.address} onChange={(e) => handleChange("address", e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Time</label>
          <input type="time" value={form.opening_time} onChange={(e) => handleChange("opening_time", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Closing Time</label>
          <input type="time" value={form.closing_time} onChange={(e) => handleChange("closing_time", e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Image URL</label>
        <input type="text" value={form.image_url} onChange={(e) => handleChange("image_url", e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400" />
      </div>

      {/* Amenities */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Amenities</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {AMENITY_SUGGESTIONS.map((amenity) => (
            <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
              className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                amenities.includes(amenity)
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
              }`}>
              {amenity}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomAmenity()}
            placeholder="Add custom amenity..."
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 text-sm" />
          <Button type="button" variant="outline" onClick={addCustomAmenity} className="gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
        {amenities.filter(a => !AMENITY_SUGGESTIONS.includes(a)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {amenities.filter(a => !AMENITY_SUGGESTIONS.includes(a)).map((amenity) => (
              <span key={amenity} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-full text-sm">
                {amenity}
                <button onClick={() => toggleAmenity(amenity)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Available Games - Steam Search */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Available Games</label>
        <p className="text-xs text-gray-500 mb-3">Search any game from Steam's catalog</p>

        {/* Selected games */}
        {games.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {games.map((game) => (
              <span key={game} className="flex items-center gap-1 px-3 py-1.5 bg-pink-600 text-white rounded-full text-sm">
                {game}
                <button onClick={() => removeGame(game)} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search box */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={gameSearch}
              onChange={(e) => handleGameSearchChange(e.target.value)}
              onFocus={() => steamResults.length > 0 && setShowDropdown(true)}
              placeholder="Search Steam games... (e.g. Valorant, CS2)"
              className="w-full pl-10 pr-10 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-400 text-sm"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Dropdown results */}
          {showDropdown && steamResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {steamResults.map((game) => (
                <button
                  key={game.id}
                  onClick={() => addGame(game.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50 transition-colors text-left"
                >
                  {game.tiny_image && (
                    <img src={game.tiny_image} alt={game.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{game.name}</span>
                  {games.includes(game.name) && (
                    <span className="ml-auto text-xs text-green-600 font-medium">Added ✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-green-600 text-sm">Saved successfully!</div>}

      <Button onClick={handleSave} disabled={loading}
        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}