import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Search, Loader2, MapPin } from "lucide-react";
import { geocodeAddress } from "../utils/geocode";

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
  onChange: (lat: number, lng: number) => void;
}

const INDIA_CENTER: L.LatLngExpression = [20.5937, 78.9629];

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">📍</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
}

/**
 * Draggable-pin location picker. The pin the owner places is the SOURCE OF TRUTH for the
 * cafe's coordinates — free-text geocoding only *seeds* it ("Find my address"), and
 * "Use my current location" captures GPS for an owner registering from the venue. This is
 * how imprecise/undetectable addresses get an exact point regardless of what was typed.
 */
export function LocationPicker({ lat, lng, address, city, onChange }: LocationPickerProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [busy, setBusy] = useState<"geo" | "gps" | null>(null);
  const [msg, setMsg] = useState("");

  // Init the map exactly once. The picker owns the marker after mount; parent prop
  // changes flow FROM this component (via onChange), so we don't re-sync from props.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const hasPoint = lat != null && lng != null;
    const map = L.map(el, { scrollWheelZoom: false }).setView(
      hasPoint ? [lat as number, lng as number] : INDIA_CENTER,
      hasPoint ? 15 : 4
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (hasPoint) attachMarker(map, lat as number, lng as number);

    // Click-to-place anywhere on the map.
    map.on("click", (e: L.LeafletMouseEvent) => setPoint(e.latlng.lat, e.latlng.lng, map.getZoom()));

    // Container may mount inside an animated step / just-opened panel with no size yet;
    // recompute once it settles so tiles render fully.
    const t = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attachMarker(map: L.Map, la: number, ln: number) {
    const m = L.marker([la, ln], { icon: pinIcon(), draggable: true }).addTo(map);
    m.on("dragend", () => {
      const p = m.getLatLng();
      onChangeRef.current(p.lat, p.lng);
    });
    markerRef.current = m;
  }

  // Move (or create) the pin, recenter, and report up.
  function setPoint(la: number, ln: number, zoom = 16) {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.setLatLng([la, ln]);
    else attachMarker(map, la, ln);
    map.setView([la, ln], zoom);
    onChangeRef.current(la, ln);
  }

  const findAddress = async () => {
    setBusy("geo");
    setMsg("");
    const { lat: la, lng: ln } = await geocodeAddress(address, city);
    setBusy(null);
    if (la != null && ln != null) {
      setPoint(la, ln);
      setMsg("Pin placed from your address — drag it to the exact spot.");
    } else {
      setMsg("Couldn't find that address. Drop the pin manually or use your current location.");
    }
  };

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setMsg("Location isn't available on this device.");
      return;
    }
    setBusy("gps");
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        setPoint(pos.coords.latitude, pos.coords.longitude, 17);
        setMsg("Pinned to your current location — drag if it's slightly off.");
      },
      () => {
        setBusy(null);
        setMsg("Couldn't get your location. Drop the pin manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const btn =
    "filter-chip flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={findAddress}
          disabled={busy !== null || !(address || city)}
          className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {busy === "geo" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Find my address
        </button>
        <button
          type="button"
          onClick={useCurrent}
          disabled={busy !== null}
          className={`${btn} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`}
        >
          {busy === "gps" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          Use my current location
        </button>
      </div>

      <div
        ref={elRef}
        className="w-full h-[240px] rounded-xl overflow-hidden border border-gray-200 z-0"
        role="application"
        aria-label="Drag the pin to set your cafe's exact location"
      />

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        {lat != null && lng != null ? (
          <span>
            Pinned at <span className="font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span> — drag the pin to adjust.
          </span>
        ) : (
          <span>Tap “Find my address”, use your current location, or click the map to drop the pin.</span>
        )}
      </div>
      {msg && <p className="text-xs text-blue-600">{msg}</p>}
    </div>
  );
}
