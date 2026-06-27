// recipes.ts — platform-wide Tailwind class recipes (composite "molecules").
//
// Promoted out of components/leksokipos/ (ADR 0008): these recipes are imported
// by shared/ components and several games, so they are platform-scoped, not
// Leksokipos-specific.
//
// Colours reference SEMANTIC TOKENS (see globals.css / ADR 0008) — never literal
// palette classes. Tokens flip light/dark from one place, so recipes carry NO
// `dark:` pairs. In-between shades were normalised to the nearest token.
//
// Documented exceptions (theme-independent by design):
//   - foundWordPangramClass uses `text-stone-900`: dark text on a fixed-yellow
//     chip must stay dark in BOTH themes, so it is intentionally not a token.
//
// Sections: Form labels & inputs · Buttons · Semantic colours · Feedback ·
//           Found-words · Score bar · Leaderboard

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

/** Small circular icon button for game headers (variant toggle, share, etc.).
 * Documented exception: border-stone-300 is intentionally hardcoded (not a token).
 * stone-300 reads clearly against both the light page background AND the dark
 * stone-950 surface — the same pattern used by ShareButton. border-border
 * (stone-200 light / stone-700 dark) is too faint on the dark surface. */
export const btnHeaderIcon =
  "flex items-center justify-center rounded-full border border-stone-300 text-muted hover:bg-surface-raised active:bg-border transition-colors";

/** Secondary action button — border only, neutral fill (Delete / Shuffle / 🏆) */
export const btnSecondary =
  "px-4 py-2 rounded-full border border-border text-foreground text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors";

/** Primary action button — solid inverted fill (Submit / Save) */
export const btnPrimary =
  "px-8 py-2 rounded-full bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity";

/** Compact primary button — used inside modals where space is tight */
export const btnPrimaryCompact =
  "px-3 py-1.5 bg-inverted text-inverted-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity";

/** Give-up button — small, destructive tone, shown inline next to word count */
export const btnGiveUp =
  "text-xs font-medium text-danger border border-danger/40 rounded-full px-3 py-1 hover:bg-danger/10 active:bg-danger/20 transition-colors";

/** Cancel / secondary modal button */
export const btnCancel =
  "flex-1 py-2 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors";

/** Full-width modal submit button */
export const btnModalSubmit =
  "flex-1 py-2 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity";

// ── Semantic colour palette ───────────────────────────────────────────────────
// Every game-specific colour decision references a token. Never hardcode a palette
// class in a component — reference these instead.

/** The mandatory centre letter — golden accent */
export const colorCenterLetter = "text-accent";

/** An outer-ring letter in the word input display */
export const colorOuterLetter = "text-foreground";

/** Placeholder shown when the word input is empty */
export const colorInputPlaceholder = "text-muted";

/** Pangram highlight bg — word chips */
export const colorPangramBg   = "bg-brand";
/** Pangram highlight text — celebration message */
export const colorPangramText = "text-accent";

/** Regular found-word chip bg */
export const colorWordChipBg   = "bg-surface-raised";
/** Regular found-word chip text */
export const colorWordChipText = "text-foreground";

/** Score progress-bar fill colour */
export const colorScoreBarFill  = "bg-brand";
/** Score progress-bar track colour */
export const colorScoreBarTrack = "bg-border";

// ── Feedback messages (after word submission) ─────────────────────────────────

/** Wrapper for "valid word" feedback row */
export const feedbackValidContainer =
  "flex items-center gap-2 text-sm font-semibold";

/** Pangram celebration text */
export const feedbackPangramClass =
  `${colorPangramText} uppercase tracking-wide`;

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
  `px-2 py-0.5 rounded ${colorWordChipBg} ${colorWordChipText} text-sm uppercase`;

/** Pangram found-word chip — dark text on fixed-yellow stays dark in both themes */
export const foundWordPangramClass =
  `px-2 py-0.5 rounded ${colorPangramBg} text-stone-900 text-sm font-semibold uppercase`;

// ── Score bar ─────────────────────────────────────────────────────────────────

/** Progress-bar track (background) */
export const scoreBarTrack =
  `relative h-3 w-full rounded-full ${colorScoreBarTrack}`;

/** Progress-bar fill (foreground) */
export const scoreBarFill =
  `h-full rounded-full ${colorScoreBarFill} transition-all duration-500`;

// ── Leaderboard table ─────────────────────────────────────────────────────────

/** Every leaderboard data row */
export const lbRowBase   = "border-t border-border/40 text-sm";

/** Highlighted row for the current player — faint brand tint */
export const lbRowPlayer = "bg-brand/10 font-semibold";

/** Rank number cell */
export const lbTdRank  = "py-1.5 pr-2 text-muted text-xs w-6 tabular-nums";

/** Player name cell */
export const lbTdName  = "py-1.5 text-foreground";

/** Score cell */
export const lbTdScore = "py-1.5 text-right font-mono text-foreground pl-4";
