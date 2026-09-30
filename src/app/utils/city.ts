/** Normalize city: trim, title-case each word, and if it contains a comma take
 *  the last segment (handles "Baner Road, Baner, Pune" → "Pune", "PUNE" → "Pune",
 *  "greater noida" → "Greater Noida"). */
export function normalizeCity(raw: string): string {
  const part = raw.includes(",") ? raw.split(",").pop()!.trim() : raw.trim();
  return part.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
