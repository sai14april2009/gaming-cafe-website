import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { fetchGameImage } from "../data/gameImages";

export function SteamGameImage({ game }: { game: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGameImage(game).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [game]);

  if (src === null) {
    // Loading — show placeholder bg
    return <div className="w-full h-full bg-gray-200 animate-pulse" />;
  }
  if (src === "") {
    return <Gamepad2 className="w-8 h-8 text-gray-400" />;
  }
  return <img src={src} alt={game} className="w-full h-full object-cover" />;
}
