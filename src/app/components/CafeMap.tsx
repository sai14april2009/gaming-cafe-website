import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Clustering + spiderfy so coincident/very-close pins fan out instead of stacking.
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export interface MapCafe {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  price_per_hour: number;
  distanceKm?: number | null;
}

interface CafeMapProps {
  cafes: MapCafe[];
  userLoc?: { lat: number; lng: number } | null;
  /** Called when a price pin is clicked, so the list can scroll to that cafe. */
  onSelect?: (cafeId: string) => void;
}

// Airbnb-style price pin — a white pill with the hourly rate. Inline styles keep the
// marker self-contained (no dependency on a stylesheet loading before Leaflet renders).
function pricePin(price: number, active: boolean): L.DivIcon {
  const bg = active ? "#2563eb" : "#ffffff";
  const fg = active ? "#ffffff" : "#111827";
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:${fg};font-weight:700;font-size:12px;
      padding:4px 10px;border-radius:999px;border:1px solid rgba(15,23,42,.12);
      box-shadow:0 2px 8px rgba(15,23,42,.28);white-space:nowrap;
      font-family:system-ui,sans-serif;line-height:1.1">₹${price}</div>`,
    iconSize: [48, 24],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22],
  });
}

function youIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#06b6d4;
      border:3px solid #fff;box-shadow:0 0 0 3px rgba(6,182,212,.35),0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function CafeMap({ cafes, userLoc, onSelect }: CafeMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const points = cafes.filter(
    (c) => typeof c.latitude === "number" && typeof c.longitude === "number"
  );

  // Rebuild when the set of plotted points or the user location changes. Keyed on a
  // stable signature so unrelated re-renders (e.g. hover state) don't rebuild the map.
  const sig =
    points.map((c) => `${c.id}:${c.latitude},${c.longitude}:${c.price_per_hour}`).join("|") +
    `#${userLoc ? `${userLoc.lat},${userLoc.lng}` : "none"}`;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const latlngs: L.LatLngExpression[] = [];

    // Cafe pins live in a cluster group. Two cafes at the same spot (e.g. same mall)
    // collapse to a count bubble and spiderfy apart on click, so neither hides the other.
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.6,
      maxClusterRadius: 40, // only genuinely-close pins cluster; distinct cafes stay separate
    });

    points.forEach((c) => {
      const m = L.marker([c.latitude, c.longitude], { icon: pricePin(c.price_per_hour, false) });
      const dist =
        typeof c.distanceKm === "number" ? `<div style="color:#2563eb;font-weight:600">${c.distanceKm.toFixed(1)} km away</div>` : "";
      m.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:120px">
           <div style="font-weight:700;font-size:14px;margin-bottom:2px">${c.name}</div>
           <div style="color:#6b7280;font-size:12px">${c.city}</div>
           <div style="font-size:12px;margin-top:2px">₹${c.price_per_hour}/hour</div>
           ${dist}
         </div>`
      );
      if (onSelect) m.on("click", () => onSelect(c.id));
      cluster.addLayer(m);
      latlngs.push([c.latitude, c.longitude]);
    });
    map.addLayer(cluster);

    if (userLoc) {
      L.marker([userLoc.lat, userLoc.lng], { icon: youIcon(), zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<div style="font-family:system-ui,sans-serif;font-weight:600">You are here</div>');
      latlngs.push([userLoc.lat, userLoc.lng]);
    }

    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 13);
    } else {
      map.setView([20.5937, 78.9629], 4); // India fallback when nothing is placed yet
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <div
      ref={elRef}
      className="w-full h-[320px] sm:h-[380px] rounded-xl overflow-hidden border border-gray-200 z-0"
      role="application"
      aria-label="Map of gaming cafes"
    />
  );
}
