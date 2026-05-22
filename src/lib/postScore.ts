// Shared fire-and-forget POST utility for score submission hooks.
// Silently swallows all network errors — score posting must never crash the game.

export function postScore(url: string, body: unknown): void {
  fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}
