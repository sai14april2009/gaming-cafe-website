// Client helper for the /api/geocode Nominatim proxy.
//
// Nominatim often misses a full specific street address (e.g. a building name it
// doesn't know) but reliably resolves the locality/city. So we try the full
// "address, city" first and fall back to "city" alone — a city-centroid coordinate
// is far better than none (the cafe still shows up in distance results, roughly placed).
// Returns null coords only when even the city can't be resolved.

export interface GeoResult {
  lat: number | null;
  lng: number | null;
}

async function tryQuery(q: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.lat === "number" && typeof d.lng === "number" ? { lat: d.lat, lng: d.lng } : null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string, city: string): Promise<GeoResult> {
  const full = [address, city].filter(Boolean).join(", ");
  if (full) {
    const hit = await tryQuery(full);
    if (hit) return hit;
  }
  if (city) {
    const cityHit = await tryQuery(city);
    if (cityHit) return cityHit;
  }
  return { lat: null, lng: null };
}
