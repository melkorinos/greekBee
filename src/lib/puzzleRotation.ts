/**
 * Maps a date string to a deterministic index into a puzzle list.
 * Epoch is 2025-01-01; negative offsets wrap correctly via the double-modulo.
 */
export function dateToIndex(dateStr: string, listLength: number): number {
  const epoch     = new Date("2025-01-01").getTime();
  const target    = new Date(dateStr).getTime();
  const dayOffset = Math.floor((target - epoch) / 86_400_000);
  return ((dayOffset % listLength) + listLength) % listLength;
}
