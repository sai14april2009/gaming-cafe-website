import { Link } from "react-router";
import { Star, MapPin } from "lucide-react";
import { GamingCafe } from "../data/mockData";

interface CafeCardProps {
  cafe: GamingCafe;
}

export function CafeCard({ cafe }: CafeCardProps) {
  return (
    <Link
      to={`/cafe/${cafe.id}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={cafe.image}
          alt={cafe.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{cafe.name}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{cafe.rating}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-gray-600 mb-2">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{cafe.location}, {cafe.city}</span>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">{cafe.totalStations} stations</span>
          <div className="text-right">
            <span className="font-semibold text-lg">${cafe.pricePerHour}</span>
            <span className="text-sm text-gray-600">/hour</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
