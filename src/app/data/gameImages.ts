// In-memory cache: game name → Steam header image URL (or "" for misses)
const cache = new Map<string, string>();

/**
 * Fetch the Steam header image for a game name via our proxy.
 * Returns the URL on hit, "" on miss. Caches both.
 */
export async function fetchGameImage(gameName: string): Promise<string> {
  const cached = cache.get(gameName);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `/api/steam-search?term=${encodeURIComponent(gameName)}`
    );
    const data = await res.json();
    const app = data?.items?.[0];
    // Steam header capsule (460×215) — better than tiny_image
    const url = app
      ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${app.id}/header.jpg`
      : "";
    cache.set(gameName, url);
    return url;
  } catch {
    cache.set(gameName, "");
    return "";
  }
}
