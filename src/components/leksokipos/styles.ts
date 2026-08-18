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

// ── Action-button squircle (TICKET-16) ────────────────────────────────────────
//
// The four action buttons (Διαγραφή, Καθαρισμός, Ανακάτεμα, Καταχώρηση) share one
// SHAPE — an ELLIPTICAL corner, so the box reads as a stretched key rather than a
// pill or a circle — in two sizes: the authored 44 × 34 beside the typed letters,
// and 15% larger in the action row, where a thumb has to hit it. The corner needs
// two radii, which is why globals.css carries --radius-squircle-x / -y (and the
// -row- pair) rather than a single --radius-squircle; they are composed here with
// an arbitrary-property utility because Tailwind's rounded-* only emits one radius.

// Size and colour are separate strings because the two Καταχώρηση buttons share a
// colour rule and NOT a size: the inline one sits beside 3rem letters, while the
// row is thumb-sized. Compose one box with one skin at the call site.

const squircleShared =
  "inline-flex items-center justify-center flex-none border transition-colors";

/** Box beside the typed letters: the authored 44 × 34. */
export const squircleBox =
  `${squircleShared} w-11 h-8.5 ` +
  "[border-radius:var(--radius-squircle-x)/var(--radius-squircle-y)]";

/** Box in the action row: the same squircle 15% larger, 50 × 39. */
export const squircleBoxRow =
  `${squircleShared} w-12.5 h-9.75 ` +
  "[border-radius:var(--radius-squircle-row-x)/var(--radius-squircle-row-y)]";

/** The three neutral action buttons — outline only, icon in the text colour. */
export const btnSquircle =
  "border-border bg-transparent text-foreground hover:bg-surface-raised active:bg-surface-raised";

/** Καταχώρηση, submittable — solid green fill, white mark. */
export const btnSquircleGo =
  "border-correct bg-correct text-white hover:opacity-90";

/** Καταχώρηση, below the minimum word length — visible, muted, and disabled. */
export const btnSquircleDisabled =
  "border-border bg-surface-raised text-muted cursor-not-allowed";
