// Fire-and-forget JSON POST — used by score-submission hooks.
// Never throws; score posting must never crash the game.
export function postScore(url: string, body: unknown): void {
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

/**
 * Async sibling of `postScore` for callers that must know whether the post landed —
 * currently the Offline Score Outbox flush, which has to KEEP an entry whose post
 * failed rather than clear it (ADR 0010).
 *
 * Deliberately a sibling, not a replacement: `postScore` stays fire-and-forget so
 * the games posting through it keep its "never crash the game" guarantee.
 * Like `postScore`, this never throws — a rejected fetch or a non-ok status is
 * reported as `false`.
 */
export async function postScoreAwaitable(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trims and falls back to "Ανώνυμος" for blank/null display names. */
export function sanitizeDisplayName(raw: string | null | undefined): string {
  return (raw ?? "").trim() || "Ανώνυμος";
}
