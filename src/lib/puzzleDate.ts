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

/**
 * The earliest date a Community Puzzle may be scheduled for, given the dates
 * already taken — the scheduling rule behind approval.
 *
 * Two invariants: the result is always strictly after `today` (an approved
 * puzzle never replaces the one players are mid-round on), and it is the
 * *earliest* such free date, so gaps left by a hand-picked override get filled
 * before the queue extends further out.
 *
 * Booked dates in the past are ignored — they can never collide — and nulls are
 * tolerated because `scheduled_date` is a nullable column, so an approved-but-
 * unscheduled row (only reachable by direct SQL) must not shift the calendar.
 *
 * Anchored to UTC like the rest of this file: "tomorrow" is UTC-tomorrow, the
 * same boundary the daily rotation already turns on.
 */
export function nextFreeScheduledDate(
  taken: readonly (string | null | undefined)[],
  today: string,
): string {
  const booked = new Set(taken.filter((d): d is string => Boolean(d)));

  const cursor = new Date(today + "T00:00:00Z");
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (booked.has(cursor.toISOString().slice(0, 10)));

  return cursor.toISOString().slice(0, 10);
}

/** Strips a trailing locale suffix from a puzzle ID (e.g. "2026-05-22-el" → "2026-05-22"). */
export function normalizePuzzleDate(raw: string | null | undefined): string {
  return (raw ?? "").replace(/-[a-z]{2}$/i, "");
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true when the given string is a strict ISO date (YYYY-MM-DD, no suffix).
 *
 * The platform's one definition of a well-formed puzzle date, so every boundary
 * that takes a date from the outside — API route handlers validating a body or
 * query param, `resolvePuzzleDateParam` below — measures against the same rule.
 * A second copy of this regex once lived in the Leksokipos game lib, which is
 * why three edge routes with nothing to do with that game imported from it.
 */
export function isISODate(value: string): boolean {
  return ISO_DATE_RE.test(value);
}

/**
 * Resolves a `?puzzle=` search param (a game's "play an older puzzle" link)
 * to a valid YYYY-MM-DD date, falling back to `today` for anything missing
 * or malformed — a page route is a system boundary, the param is user input.
 */
export function resolvePuzzleDateParam(param: string | undefined, today: string): string {
  return param && isISODate(param) ? param : today;
}
