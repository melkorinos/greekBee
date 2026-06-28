/** Strips a trailing locale suffix from a puzzle ID (e.g. "2026-05-22-el" → "2026-05-22"). */
export function normalizePuzzleDate(raw: string | null | undefined): string {
  return (raw ?? "").replace(/-[a-z]{2}$/i, "");
}
