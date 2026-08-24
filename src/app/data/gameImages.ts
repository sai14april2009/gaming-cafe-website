// In-memory cache: game name → Steam header image URL (or "" for misses)
const cache = new Map<string, string>();

// Non-Steam games that will never resolve via the Steam search proxy.
// Uses official or high-quality public images.
const NON_STEAM_FALLBACKS: Record<string, string> = {
  "Valorant": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/7e25eb44ad5c04a1fbb38e30d227caab83e0dcf0-1920x1080.jpg",
  "Overwatch 2": "https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt0af606e55e228e0d/overwatch-2-logo.png",
  "Rocket League": "https://rocketleague.media.zestyio.com/rl_home_hero-1.jpg",
  "NBA 2K24": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2338770/header.jpg",
  "FIFA 24": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg",
  "Fortnite": "https://cdn2.unrealengine.com/fortnite-chapter-5-season-1-background-2560x1440-a6d3a498fdb5.jpg",
  "Mario Kart": "https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/ncom/software/switch/70010000000153/7a5d2c5bcdece2dae32a10b8e5e060d47c4903aa",
  "Smash Bros": "https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/ncom/software/switch/70010000012332/ac4d1fc9e5ca80b0f6e246b30dbcf3d1caac1534",
  "Horizon Forbidden West": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2420110/header.jpg",
};

/**
 * Fetch the Steam header image for a game name via our proxy.
 * Falls back to NON_STEAM_FALLBACKS for games not on Steam.
 * Returns the URL on hit, "" on miss. Caches both.
 */
export async function fetchGameImage(gameName: string): Promise<string> {
  const cached = cache.get(gameName);
  if (cached !== undefined) return cached;

  // Check non-Steam fallback first
  const fallback = NON_STEAM_FALLBACKS[gameName];
  if (fallback) {
    cache.set(gameName, fallback);
    return fallback;
  }

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
