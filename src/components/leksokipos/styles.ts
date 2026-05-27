// styles.ts — shared Tailwind class tokens for all Leksokipos UI components.
//
// Centralise every repeated pattern here so a future rebrand is a single-file change.
// Components import named constants — no magic strings scattered across the codebase.
// Each token includes both light and dark: variants inline.
//
// Sections:
//   Form labels & inputs
//   Buttons
//   Colors / semantic palette
//   Feedback messages
//   Found-words list
//   Score bar
//   Leaderboard table

// ── Form labels ───────────────────────────────────────────────────────────────

/** Primary label: "Λέξη", "Όνομα", "Ημερομηνία" — dark, readable */
export const labelClass =
  "text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1";

/** Modifier for optional sub-text: "(προαιρετικό)" */
export const labelOptionalClass =
  "font-normal text-stone-400";

// ── Form inputs ───────────────────────────────────────────────────────────────

/** Standard editable text input — used in modals */
export const inputClass =
  "w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 transition-shadow";

/** Read-only display input (e.g. the word field in SuggestWordModal) */
export const inputReadonlyClass =
  "w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-mono font-semibold select-none";

/** Compact input for tighter layouts (LeaderboardModal name + date) */
export const inputCompactClass =
  "border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-600";

// ── Buttons ───────────────────────────────────────────────────────────────────

/** Secondary action button — border only, neutral fill (Delete / Shuffle / 🏆) */
export const btnSecondary =
  "px-4 py-2 rounded-full border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors";

/** Primary action button — solid dark fill (Submit / Save) */
export const btnPrimary =
  "px-8 py-2 rounded-full bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-100 active:bg-stone-900 dark:active:bg-white transition-colors";

/** Compact primary button — used inside modals where space is tight */
export const btnPrimaryCompact =
  "px-3 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm rounded-lg hover:bg-stone-700 dark:hover:bg-stone-100 active:bg-stone-900 dark:active:bg-white transition-colors disabled:opacity-40";

/** Give-up button — small, destructive tone, shown inline next to word count */
export const btnGiveUp =
  "text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-full px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950 active:bg-red-100 dark:active:bg-red-900 transition-colors";

/** Cancel / secondary modal button */
export const btnCancel =
  "flex-1 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700 transition-colors";

/** Full-width modal submit button */
export const btnModalSubmit =
  "flex-1 py-2 rounded-xl bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-100 active:bg-stone-900 dark:active:bg-white disabled:opacity-50 transition-colors";

// ── Semantic colour palette ───────────────────────────────────────────────────
// Every game-specific colour decision lives here.
// Never hardcode a colour in a component — reference these instead.

/** The mandatory centre letter — golden yellow */
export const colorCenterLetter = "text-yellow-500";

/** An outer-ring letter in the word input display */
export const colorOuterLetter = "text-stone-800 dark:text-stone-200";

/** Placeholder shown when the word input is empty */
export const colorInputPlaceholder = "text-stone-300 dark:text-stone-600";

/** Pangram highlight bg — word chips */
export const colorPangramBg   = "bg-yellow-300 dark:bg-yellow-500";
/** Pangram highlight text — celebration message */
export const colorPangramText = "text-yellow-600 dark:text-yellow-400";

/** Regular found-word chip bg */
export const colorWordChipBg   = "bg-stone-100 dark:bg-stone-700";
/** Regular found-word chip text */
export const colorWordChipText = "text-stone-700 dark:text-stone-200";

/** Score progress-bar fill colour */
export const colorScoreBarFill  = "bg-yellow-400";
/** Score progress-bar track colour */
export const colorScoreBarTrack = "bg-stone-200 dark:bg-stone-700";

// ── Feedback messages (after word submission) ─────────────────────────────────

/** Wrapper for "valid word" feedback row */
export const feedbackValidContainer =
  "flex items-center gap-2 text-sm font-semibold";

/** Pangram celebration text */
export const feedbackPangramClass =
  `${colorPangramText} uppercase tracking-wide`;

/** Normal valid-word accepted text */
export const feedbackValidClass =
  "text-green-600 dark:text-green-400 uppercase tracking-wide";

/** Error / rejection text (too short, not in list, etc.) */
export const feedbackErrorClass =
  "text-sm font-medium text-red-500 dark:text-red-400";

/** "Just suggested" confirmation inline text */
export const feedbackJustSuggestedClass =
  "text-xs text-green-600 dark:text-green-400 font-medium";

/** "Already suggested" muted inline text */
export const feedbackAlreadySuggestedClass =
  "text-xs text-stone-400 dark:text-stone-500";

/** Suggest-link button (after not_in_list rejection) */
export const feedbackSuggestLinkClass =
  "text-xs text-stone-500 dark:text-stone-400 underline underline-offset-2 hover:text-stone-800 dark:hover:text-stone-200 transition-colors";

// ── Found-words list ──────────────────────────────────────────────────────────

/** Normal found-word chip */
export const foundWordClass =
  `px-2 py-0.5 rounded ${colorWordChipBg} ${colorWordChipText} text-sm uppercase`;

/** Pangram found-word chip */
export const foundWordPangramClass =
  `px-2 py-0.5 rounded ${colorPangramBg} text-stone-800 dark:text-stone-900 text-sm font-semibold uppercase`;

// ── Score bar ─────────────────────────────────────────────────────────────────

/** Progress-bar track (background) */
export const scoreBarTrack =
  `relative h-3 w-full rounded-full ${colorScoreBarTrack}`;

/** Progress-bar fill (foreground) */
export const scoreBarFill =
  `h-full rounded-full ${colorScoreBarFill} transition-all duration-500`;

// ── Leaderboard table ─────────────────────────────────────────────────────────

/** Every leaderboard data row */
export const lbRowBase   = "border-t border-stone-50 dark:border-stone-800 text-sm";

/** Highlighted row for the current player */
export const lbRowPlayer = "bg-amber-50 dark:bg-stone-800 font-semibold";

/** Rank number cell */
export const lbTdRank  = "py-1.5 pr-2 text-stone-400 dark:text-stone-500 text-xs w-6 tabular-nums";

/** Player name cell */
export const lbTdName  = "py-1.5 text-stone-700 dark:text-stone-300";

/** Score cell */
export const lbTdScore = "py-1.5 text-right font-mono text-stone-800 dark:text-stone-200 pl-4";
