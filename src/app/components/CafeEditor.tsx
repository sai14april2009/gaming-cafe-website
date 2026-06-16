const searchSteam = async (query: string) => {
  if (!query.trim() || query.length < 2) {
    setSteamResults([]);
    setShowDropdown(false);
    return;
  }
  setSearchLoading(true);
  try {
   const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(steamUrl)}`
    );
    const raw = await res.json();
    const data = JSON.parse(raw.contents);
    const items: SteamGame[] = (data.items || []).slice(0, 8).map((item: any) => ({
      id: item.id,
      name: item.name,
      tiny_image: item.tiny_image,
    }));
    setSteamResults(items);
    setShowDropdown(items.length > 0);
  } catch {
    setSteamResults([]);
  }
  setSearchLoading(false);
};