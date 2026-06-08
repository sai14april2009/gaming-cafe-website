import { useState } from "react";
import { Search, Gamepad2 } from "lucide-react";
import { gamingCafes, allGames, gameImages } from "../data/mockData";
import { CafeCard } from "./CafeCard";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

export function SearchByGame() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const filteredGames = allGames.filter((game) =>
    game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cafesWithSelectedGame = selectedGame
    ? gamingCafes.filter((cafe) => cafe.games.includes(selectedGame))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Find Cafes by Game
        </h1>
        <p className="text-gray-600 text-lg">
          Select your favorite game and discover cafes where you can play it
        </p>
      </div>

      {/* Search Games */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for a game..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Games List */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          {filteredGames.map((game) => {
            const cafeCount = gamingCafes.filter((cafe) => cafe.games.includes(game)).length;
            const gameImage = gameImages[game];
            return (
              <button
                key={game}
                onClick={() => setSelectedGame(selectedGame === game ? null : game)}
                className={`flex flex-col overflow-hidden rounded-lg border-2 transition-all ${
                  selectedGame === game
                    ? "border-purple-600 shadow-lg"
                    : "border-gray-200 hover:border-purple-300"
                }`}
              >
                {gameImage && (
                  <div className="w-full h-32 overflow-hidden">
                    <img
                      src={gameImage}
                      alt={game}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3 bg-white">
                  <span className="font-medium text-left text-sm block mb-1">{game}</span>
                  <span className="text-xs text-gray-500">{cafeCount} cafes</span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <p className="text-center text-gray-500 py-8">No games found</p>
        )}
      </div>

      {/* Results */}
      {selectedGame && (
        <div>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">Cafes with {selectedGame}</h2>
              <Badge variant="secondary" className="text-base">
                {cafesWithSelectedGame.length} found
              </Badge>
            </div>
            <p className="text-gray-600">Gaming cafes where you can play {selectedGame}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cafesWithSelectedGame.map((cafe) => (
              <CafeCard key={cafe.id} cafe={cafe} />
            ))}
          </div>

          {cafesWithSelectedGame.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-500 text-lg">No cafes found with this game</p>
            </div>
          )}
        </div>
      )}

      {!selectedGame && (
        <div className="text-center py-16 bg-white rounded-xl">
          <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Select a game to see available cafes</p>
        </div>
      )}
    </div>
  );
}