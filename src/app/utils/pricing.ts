// Effective hourly price for a gaming system: its own per-system price when set,
// otherwise the cafe's default price_per_hour. Systems store NULL to mean "inherit
// the cafe default", so use ?? (a valid explicit 0 must survive, unlike ||).
export function effectiveSystemPrice(
  systemPrice: number | null | undefined,
  cafeDefault: number
): number {
  return systemPrice ?? cafeDefault;
}

// Lowest effective price across a cafe's systems, for a "from ₹X" display. Falls
// back to the cafe default when the cafe has no systems yet.
export function minSystemPrice(
  systemPrices: (number | null | undefined)[],
  cafeDefault: number
): number {
  if (systemPrices.length === 0) return cafeDefault;
  return Math.min(...systemPrices.map((p) => effectiveSystemPrice(p, cafeDefault)));
}
