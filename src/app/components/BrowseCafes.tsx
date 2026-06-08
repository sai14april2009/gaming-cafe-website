import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { gamingCafes } from "../data/mockData";
import { CafeCard } from "./CafeCard";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function BrowseCafes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const cities = ["all", ...Array.from(new Set(gamingCafes.map((cafe) => cafe.city)))];

  const filteredCafes = gamingCafes.filter((cafe) => {
    const matchesSearch =
      cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === "all" || cafe.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"} found
        </p>
      </div>

      {/* Cafes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCafes.map((cafe) => (
          <CafeCard key={cafe.id} cafe={cafe} />
        ))}
      </div>

      {filteredCafes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cafes found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
