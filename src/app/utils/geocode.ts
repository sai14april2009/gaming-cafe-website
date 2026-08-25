// Client helper for the /api/geocode Nominatim proxy.
//
// The endpoint returns { results: [{ lat, lng, display_name, city }] }.
//
// geocodeAddress (one-shot): Nominatim often misses a full specific street address but
// reliably resolves the locality/city, so we try "address, city" first and fall back to
// "city" alone — a city-centroid coordinate beats none. Returns null coords only when even
// the city can't be resolved.
//
// searchAddresses (autocomplete): returns up to 6 candidates for a live suggestions dropdown.

export interface GeoResult {
  lat: number | null;
  lng: number | null;
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  city: string;
}

async function tryQuery(q: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const d = await res.json();
    const first = d.results?.[0];
    return first && typeof first.lat === "number" && typeof first.lng === "number"
      ? { lat: first.lat, lng: first.lng }
      : null;
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

// ponytail: progressive word-drop fallback — Nominatim misses institution/acronym
// names (e.g. "DIAT Khadakwasla Pune") but resolves the area/city part. Drop words
// from the front until we get results. Swap to Google Places if quality matters more
// than cost.
export async function searchAddresses(q: string): Promise<AddressSuggestion[]> {
  if (q.trim().length < 3) return [];
  const words = q.trim().split(/\s+/);
  // Try full query first, then progressively drop leading words
  for (let drop = 0; drop < words.length && words.length - drop >= 2; drop++) {
    const attempt = words.slice(drop).join(" ");
    if (attempt.length < 3) continue;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(attempt)}&limit=6`);
      if (!res.ok) continue;
      const d = await res.json();
      const results = (d.results || [])
        .filter((r: any) => typeof r.lat === "number" && typeof r.lng === "number")
        .map((r: any) => ({ label: r.display_name, lat: r.lat, lng: r.lng, city: r.city || "" }));
      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }
  return [];
}
