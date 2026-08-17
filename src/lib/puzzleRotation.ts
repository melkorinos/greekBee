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

/** A row a hand-authored daily calendar can be keyed on: an ISO `YYYY-MM-DD` date. */
export interface DatedPuzzleRow {
  date: string;
}

/**
 * The row a hand-authored daily calendar serves on `dateISO`: an exact date
 * match when the calendar covers the day, else a deterministic rotation.
 *
 * ── The miss rule is the point of this function ──────────────────────────────
 * A calendar always runs out — a gap, or simply the last authored day passing.
 * The obvious miss fallback ("serve the last row") is the wrong one twice over:
 * it serves the FURTHEST-FUTURE board, spoiling it, and then serves that same
 * board on every day after, so the game silently freezes instead of failing.
 * Rotating over rows already DUE (`date <= dateISO`) can do neither — it only
 * ever replays boards the calendar has already spent.
 *
 * When nothing is due yet (an all-future calendar, or a one-row sample build)
 * we rotate the whole pool rather than fail: rendering beats hiding.
 *
 * The exact-match path returns before any sorting, so the everyday case costs
 * one linear scan; the sort only runs on the miss path.
 */
export function pickByDateOrRotate<T extends DatedPuzzleRow>(
  dateISO: string,
  rows: readonly T[],
): T {
  if (rows.length === 0) {
    throw new Error("pickByDateOrRotate: puzzle pool is empty");
  }

  const exact = rows.find((r) => r.date === dateISO);
  if (exact) return exact;

  const due  = rows.filter((r) => r.date <= dateISO);
  const pool = due.length > 0 ? due : rows;

  const sorted = [...pool].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[dateToIndex(dateISO, sorted.length)];
}
