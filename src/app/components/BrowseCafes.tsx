import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, SlidersHorizontal, Star, MapPin } from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "../../supabase";

interface DbCafe {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  price_per_hour: number;
  image_url: string | null;
  is_approved: boolean;
}

export function BrowseCafes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [dbCafes, setDbCafes] = useState<DbCafe[]>([]);

  useEffect(() => {
    const fetchCafes = async () => {
      const { data, error } = await supabase
        .from("cafes")
        .select("id, name, description, city, address, price_per_hour, image_url, is_approved")
        .eq("is_approved", true);

      if (!error && data) {
        setDbCafes(data as DbCafe[]);
      }
    };

    fetchCafes();
  }, []);

  const cities = ["all", ...Array.from(new Set(dbCafes.map((cafe) => cafe.city)))];

  const filteredDbCafes = dbCafes.filter((cafe) => {
    const matchesSearch =
      cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === "all" || cafe.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  const totalCount = filteredDbCafes.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
          Find Your Perfect Gaming Cafe
        </h1>
        <p className="text-gray-600 text-lg">
          Discover premium gaming cafes with top-tier equipment near you
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by cafe name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === "all" ? "All Cities" : city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-gray-600">
          {totalCount} {totalCount === 1 ? "cafe" : "cafes"} found
        </p>
      </div>

      {/* Cafes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDbCafes.map((cafe) => (
          <Link
            key={cafe.id}
            to={`/cafe/db/${cafe.id}`}
            className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
              {cafe.image_url ? (
                <img
                  src={cafe.image_url}
                  alt={cafe.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No Image
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{cafe.name}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">New</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{cafe.address}, {cafe.city}</span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600">{cafe.description}</span>
                <div className="text-right">
                  <span className="font-semibold text-lg">₹{cafe.price_per_hour}</span>
                  <span className="text-sm text-gray-600">/hour</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalCount === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cafes found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
