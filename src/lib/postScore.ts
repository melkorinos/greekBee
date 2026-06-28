// Fire-and-forget JSON POST — used by score-submission hooks.
// Never throws; score posting must never crash the game.
export function postScore(url: string, body: unknown): void {
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

/** Trims and falls back to "Ανώνυμος" for blank/null display names. */
export function sanitizeDisplayName(raw: string | null | undefined): string {
  return (raw ?? "").trim() || "Ανώνυμος";
}
