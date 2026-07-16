/**
 * Today's ISO date string (YYYY-MM-DD) — the platform's single definition of
 * "which puzzle is today's".
 *
 * The clock is UTC, so the daily rollover happens at 02:00/03:00 Athens time
 * rather than local midnight. That is the long-standing behaviour and is
 * deliberately preserved here; this function is the one place to change it.
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the last `n` dates (newest-first) ending at `today` (YYYY-MM-DD) —
 * the leaderboard's rolling day-strip.
 *
 * Anchored to UTC because `todayISO()` is UTC: parsing "YYYY-MM-DD" without a
 * `Z` yields *local* midnight, which serialises back one day early for every
 * viewer east of UTC (the entire Greek audience). Both halves of the platform's
 * clock live in this file so they cannot drift apart again.
 */
export function getLast7Dates(today: string, n = 7): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Strips a trailing locale suffix from a puzzle ID (e.g. "2026-05-22-el" → "2026-05-22"). */
export function normalizePuzzleDate(raw: string | null | undefined): string {
  return (raw ?? "").replace(/-[a-z]{2}$/i, "");
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves a `?puzzle=` search param (a game's "play an older puzzle" link)
 * to a valid YYYY-MM-DD date, falling back to `today` for anything missing
 * or malformed — a page route is a system boundary, the param is user input.
 */
export function resolvePuzzleDateParam(param: string | undefined, today: string): string {
  return param && ISO_DATE_RE.test(param) ? param : today;
}
