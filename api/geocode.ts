export const config = { runtime: "edge" };

// Geocode a free-text address via OpenStreetMap Nominatim (free, no API key).
// Same proxy pattern as steam-search.ts — keeps the call server-side and CORS-clean,
// and lets us swap in Google/Mapbox later without touching the client.
// Nominatim's usage policy requires an identifying User-Agent.
export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ lat: null, lng: null }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": "GameOrbit/1.0 (gaming-cafe-website.vercel.app)" } }
  );
  const data = await res.json();
  const first = Array.isArray(data) && data[0] ? data[0] : null;
  const out = first
    ? { lat: parseFloat(first.lat), lng: parseFloat(first.lon), display_name: first.display_name }
    : { lat: null, lng: null };

  return new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
