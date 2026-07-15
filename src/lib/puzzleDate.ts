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
