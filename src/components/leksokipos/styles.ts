// leksokipos/styles.ts — Leksokipos-only class recipes.
//
// These are NOT platform-shared: every export here is imported solely by
// Leksokipos components (word chips, score bar, word-submission feedback).
// Platform-wide recipes (buttons, inputs, modal shell, leaderboard rows) live
// in src/styles/recipes.ts — keep this file game-scoped (ADR 0009).
//
// Colours reference SEMANTIC TOKENS (see globals.css / ADR 0008) — never literal
// palette classes, so recipes carry NO `dark:` pairs. Single-token aliases were
// inlined (ADR 0009): the token IS the single source, an alias only adds
// indirection.
//
// Documented exception (theme-independent by design):
//   - foundWordPangramClass uses `text-stone-900`: dark text on a fixed-yellow
//     (bg-brand) chip must stay dark in BOTH themes, so it is intentionally not
//     a token.

// ── Word-submission feedback ──────────────────────────────────────────────────

/** Wrapper for the "valid word" feedback row */
export const feedbackValidContainer =
  "flex items-center gap-2 text-sm font-semibold";

/** Pangram celebration text (gold accent) */
export const feedbackPangramClass =
  "text-accent uppercase tracking-wide";

/** Normal valid-word accepted text */
export const feedbackValidClass =
  "text-correct uppercase tracking-wide";

/** Error / rejection text (too short, not in list, etc.) */
export const feedbackErrorClass =
  "text-sm font-medium text-danger";

/** "Just suggested" confirmation inline text */
export const feedbackJustSuggestedClass =
  "text-xs text-correct font-medium";

/** "Already suggested" muted inline text */
export const feedbackAlreadySuggestedClass =
  "text-xs text-muted";

/** Suggest-link button (after not_in_list rejection) */
export const feedbackSuggestLinkClass =
  "text-xs text-muted underline underline-offset-2 hover:text-foreground transition-colors";

// ── Found-words list ──────────────────────────────────────────────────────────

/** Normal found-word chip */
export const foundWordClass =
  "px-2 py-0.5 rounded bg-surface-raised text-foreground text-sm uppercase";

/** Pangram found-word chip — dark text on fixed-yellow stays dark in both themes */
export const foundWordPangramClass =
  "px-2 py-0.5 rounded bg-brand text-stone-900 text-sm font-semibold uppercase";

// ── Score bar ─────────────────────────────────────────────────────────────────

/** Progress-bar track (background) */
export const scoreBarTrack =
  "relative h-3 w-full rounded-full bg-border";

/** Progress-bar fill (foreground) */
export const scoreBarFill =
  "h-full rounded-full bg-brand transition-all duration-500";

// ── Give-up button ────────────────────────────────────────────────────────────

/** Give-up button — small, destructive tone, shown inline next to word count */
export const btnGiveUp =
  "text-xs font-medium text-danger border border-danger/40 rounded-full px-3 py-1 hover:bg-danger/10 active:bg-danger/20 transition-colors";
