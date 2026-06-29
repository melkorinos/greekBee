// recipes.ts — platform-wide Tailwind class recipes (composite "molecules").
//
// Scope (ADR 0009): ONLY genuinely cross-game recipes live here — imported by
// shared/ components and/or two or more games. Game-specific recipes live next
// to their game (e.g. src/components/leksokipos/styles.ts).
//
// Colours reference SEMANTIC TOKENS (see globals.css / ADR 0008) — never literal
// palette classes. Tokens flip light/dark from one place, so recipes carry NO
// `dark:` pairs. Single-token aliases are inlined: the token is the single
// source, an alias only adds indirection.
//
// Sections: Form labels & inputs · Buttons · Leaderboard

// ── Form labels ───────────────────────────────────────────────────────────────

/** Primary label: "Λέξη", "Όνομα", "Ημερομηνία" */
export const labelClass =
  "text-xs font-medium text-muted block mb-1";

/** Modifier for optional sub-text: "(προαιρετικό)" */
export const labelOptionalClass =
  "font-normal text-muted";

// ── Form inputs ───────────────────────────────────────────────────────────────

/** Standard editable text input — used in modals */
export const inputClass =
  "w-full px-3 py-2 rounded-xl border border-border bg-surface-raised text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-border transition-shadow";

/** Read-only display input (e.g. the word field in SuggestWordModal) */
export const inputReadonlyClass =
  "w-full px-3 py-2 rounded-xl border border-border bg-surface-raised text-foreground text-sm font-mono font-semibold select-none";

/** Compact input for tighter layouts (LeaderboardModal name + date) */
export const inputCompactClass =
  "border border-border rounded-lg px-3 py-1.5 text-sm bg-surface-raised text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-border";

// ── Buttons ───────────────────────────────────────────────────────────────────
// Base fill/text/border are tokenised; hover/active polish uses opacity/token
// tints so no `dark:` pair is needed.

/** Diameter of every circular icon button in game headers. One place to change all three. */
export const btnHeaderIconSize = "w-8 h-8";

/** Small circular icon button for game headers (variant toggle, share, help).
 * Pair with btnHeaderIconSize for the full circle.
 * Border uses border-border (stone-200 light / stone-700 dark) — same token as
 * the horizontal page separator, so the circles feel visually quiet in dark mode. */
export const btnHeaderIcon =
  "flex items-center justify-center rounded-full border border-border text-muted hover:bg-surface-raised active:bg-border transition-colors";

/** Secondary action button — border only, neutral fill (Delete / Shuffle / 🏆) */
export const btnSecondary =
  "px-4 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors";

/** Primary action button — solid inverted fill (Submit / Save) */
export const btnPrimary =
  "px-8 py-2 rounded-full bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity";

/** Compact primary button — used inside modals where space is tight */
export const btnPrimaryCompact =
  "px-3 py-1.5 bg-inverted text-inverted-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity";

/** Cancel / secondary modal button */
export const btnCancel =
  "flex-1 py-2 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors";

/** Full-width modal submit button */
export const btnModalSubmit =
  "flex-1 py-2 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity";

// ── Leaderboard table ─────────────────────────────────────────────────────────

/** Every leaderboard data row */
export const lbRowBase   = "border-t border-border/40 text-sm";

/** Highlighted row for the current player — faint tint of the game's accent (ADR 0009) */
export const lbRowPlayer = "bg-game-accent/10 font-semibold";

/** Rank number cell */
export const lbTdRank  = "py-1.5 pr-2 text-muted text-xs w-6 tabular-nums";

/** Player name cell */
export const lbTdName  = "py-1.5 text-foreground";

/** Score cell */
export const lbTdScore = "py-1.5 text-right font-mono text-foreground pl-4";
