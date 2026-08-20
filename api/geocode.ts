export const config = { runtime: "edge" };

// Geocode a free-text address via OpenStreetMap Nominatim (free, no API key).
// Same proxy pattern as steam-search.ts — keeps the call server-side and CORS-clean,
// and lets us swap in Google/Mapbox later without touching the client.
// Nominatim's usage policy requires an identifying User-Agent.
//
// Returns { results: [{ lat, lng, display_name, city }] } — up to `limit` candidates.
// limit=1 (default) is used for one-shot geocoding; a higher limit powers the address
// autocomplete dropdown in LocationPicker.
export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "1", 10) || 1, 1), 8);

  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), { status: 400, headers: cors });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": "GameOrbit/1.0 (gaming-cafe-website.vercel.app)" } }
  );
  const data = await res.json();

  const results = (Array.isArray(data) ? data : []).map((r: any) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    display_name: r.display_name as string,
    city:
      r.address?.city || r.address?.town || r.address?.village ||
      r.address?.state_district || r.address?.county || "",
  }));

  return new Response(JSON.stringify({ results }), { headers: cors });
}
