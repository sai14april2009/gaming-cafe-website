import { useParams, Link } from "react-router";
import { Star, MapPin, Clock, Users, Gamepad2, Cpu, MonitorSpeaker, Wifi, Coffee, ArrowLeft } from "lucide-react";
import { gamingCafes, gameImages } from "../data/mockData";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ReviewsSection } from "./ReviewsSection";
import { GamingSystemSelector } from "./GamingSystemSelector";
import { useState, useRef } from "react";

export function CafeDetails() {
  const { id } = useParams();
  const cafe = gamingCafes.find((c) => c.id === id);
  const [showValidationError, setShowValidationError] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<any[]>([]);
  const [numberOfHours, setNumberOfHours] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const systemSelectorRef = useRef<HTMLDivElement>(null);

  const handleBookNow = () => {
    // Scroll to the gaming system selector
    if (systemSelectorRef.current) {
      systemSelectorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const formatOperatingHours = () => {
    if (!cafe) return "Open 24/7";
    const { start, end } = cafe.operatingHours;

    if (start === 0 && end === 23) return "Open 24/7";

    const formatHour = (hour: number) => {
      if (hour === 0) return "12:00 AM";
      if (hour < 12) return `${hour}:00 AM`;
      if (hour === 12) return "12:00 PM";
      return `${hour - 12}:00 PM`;
    };

    return `${formatHour(start)} - ${formatHour(end)}`;
  };

  if (!cafe) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Cafe not found</h2>
        <Link to="/">
          <Button>Back to Browse</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Image Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-4 gap-4 rounded-xl overflow-hidden">
          <div className="col-span-4 md:col-span-2 md:row-span-2">
            <img
              src={cafe.images[0]}
              alt={cafe.name}
              className="w-full h-full object-cover aspect-square md:aspect-auto"
            />
          </div>
          {cafe.images.slice(1, 5).map((image, index) => (
            <div key={index} className="col-span-2 md:col-span-1 aspect-square">
              <img
                src={image}
                alt={`${cafe.name} ${index + 2}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{cafe.name}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{cafe.rating}</span>
              <span>({cafe.reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-5 h-5" />
              <span>{cafe.location}, {cafe.city}</span>
            </div>
          </div>

          {/* Booking Section - Moved to top */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border-2 border-purple-200">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-purple-600">₹{cafe.pricePerHour}</span>
                  <span className="text-gray-600">per hour</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{cafe.rating}</span>
                  <span>· {cafe.reviews} reviews</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Stations</p>
                  <p className="font-medium">{cafe.totalStations} stations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Hours</p>
                  <p className="font-medium">{formatOperatingHours()}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg font-semibold"
                  onClick={handleBookNow}
                >
                  Book Now
                </Button>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600">
              You won't be charged yet
            </p>
          </div>

          <p className="text-gray-700 leading-relaxed">{cafe.description}</p>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Main Content */}
          <div>
            {/* Available Games */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gamepad2 className="w-6 h-6" />
                Available Games
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {cafe.games.map((game) => {
                  const gameImage = gameImages[game];
                  return (
                    <div key={game} className="flex flex-col overflow-hidden rounded-lg border-2 border-gray-200">
                      {gameImage && (
                        <div className="w-full h-24 overflow-hidden">
                          <img
                            src={gameImage}
                            alt={game}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-2 bg-white">
                        <span className="text-sm font-medium">{game}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gaming Systems - Replace old Hardware Section */}
            <div className="mb-6" ref={systemSelectorRef}>
              {showValidationError && (
                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-4">
                  <p className="text-red-600 font-semibold text-center">
                    ⚠️ Please select a gaming system, number of hours, and date before booking
                  </p>
                </div>
              )}
              <GamingSystemSelector
                systems={cafe.gamingSystems}
                onSelect={(systems) => setSelectedSystems(systems)}
                onHoursChange={(hours) => setNumberOfHours(hours)}
                onDateChange={(date) => setSelectedDate(date)}
                pricePerHour={cafe.pricePerHour}
                operatingHours={cafe.operatingHours}
                cafeName={cafe.name}
              />
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Amenities</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {cafe.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <Coffee className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-6">
              <ReviewsSection reviews={cafe.userReviews} cafeName={cafe.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}