// format.ts — display helpers for prices (pure, no React). Deterministic (no
// Intl dependency) so the same string renders on the server, the client, and in
// tests: two decimals, a Greek decimal comma, and a trailing euro sign.

/** Format a euro amount, e.g. 0.69 → "0,69 €". */
export function formatEuro(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}
