# ADR 0008 — CSS-variable semantic design tokens (revises 0002's token mechanism)

**Status**: Accepted — revises the "CSS custom properties only" rejection in [ADR 0002](./0002-dark-mode-via-tailwind-custom-variant.md). The `.dark`-class manual toggle from 0002 is unchanged.

## Context

Two recurring pains motivated this:

1. **Theme values are duplicated, not sourced.** Light/dark styling is faked by hand-writing pairs like `bg-white dark:bg-stone-900` — **335 `dark:` occurrences across 41 files**. There is no single place to change "the surface colour" or "the brand colour"; you would edit dozens of files.
2. **The font silently doesn't work.** `layout.tsx` loads Geist with `subsets: ["latin"]` (no Greek), and `globals.css` then sets `body { font-family: Arial }`, overriding Geist entirely. For a Greek word-game platform every glyph was rendering in a fallback system font.

ADR 0002 considered CSS custom properties and rejected them as "a much larger refactor with no other benefit." That premise no longer holds: the product now requires single-source theming **including** the ability to tune light and dark independently from one place, and the cost of the status quo is now quantified (335 occurrences).

## Decision

**Semantic design tokens, defined once as CSS variables, are the single source of truth for the platform's visual primitives.**

- Tokens live in `globals.css`: primitive values in the `@theme` block, with light values on `:root` and dark overrides under `.dark`. A component references a token (`bg-surface`, `text-foreground`) **once** — no `dark:` pair — and both themes flip from one file.
- **Semantic token set:** `surface`, `surface-raised`, `foreground`, `muted`, `border`, `brand`, `accent`, `danger`, plus a feedback group `correct` / `present` / `absent` / `misplaced`. The platform references only these — no literal palette classes (`yellow-400`, `stone-600`) in components.
  - Two tokens were added during the pilot: **`inverted` / `inverted-foreground`** (the dark-on-light primary-button fill — a distinct emphasis role, not an in-between shade), and a **`--text-trophy`** size token for the leaderboard 🏆.
  - In-between shades (e.g. secondary label text at `stone-600`) are **normalised to the nearest token** rather than spawning new tokens — a deliberate choice for a tight vocabulary, accepting imperceptible shifts.
- Feedback colours are tokens too (and *may* differ in dark mode). The `memory.md` note that they are "frozen" is treated as guidance, not a rule.
- **Composite recipes** (`btnPrimary`, inputs, leaderboard rows) move from `src/components/leksokipos/styles.ts` to a platform-scoped `src/styles/` home — they are not game-specific. (Refined by [ADR 0009](./0009-per-game-accent-and-chrome-consolidation.md): recipes that turned out to be Leksokipos-only — pangram/word-chip/score-bar/feedback — moved *back* to `src/components/leksokipos/styles.ts`; `src/styles/recipes.ts` keeps only genuinely cross-game recipes.)
- **Fonts:** body/UI = **Inter**, code/tiles = **JetBrains Mono**, both with a real `["latin","greek"]` subset, wired through `@theme`. The `Arial` override is deleted. No separate display font.
- **Migration is incremental, not big-bang:** pilot the token swap on Leksokipos first (it already has `styles.ts`), then propagate game-by-game as tracked issues. The pilot is a no-visual-change refactor — `brand`/`accent` map to the existing yellow; actually *changing* the brand colour is a later one-line edit.

## What this does NOT change

- The `.dark`-class manual toggle and `@custom-variant dark` from [ADR 0002](./0002-dark-mode-via-tailwind-custom-variant.md) stay. Theme is still switched by toggling `.dark` on `<html>`, never `prefers-color-scheme`.
- Design tokens are **not** added to `CONTEXT.md` — that file is a game-domain glossary, and tokens are design-system vocabulary recorded here instead.

## Consequences

- Components stop carrying `dark:` pairs as they migrate; the 335 occurrences shrink per game.
- "Change the brand colour / surface / font" becomes a one-file (often one-line) edit, by design.
- During propagation, two styling idioms coexist (literal `dark:` pairs in not-yet-migrated games, tokens in migrated ones). Accepted as transitional; the per-game issue list tracks the remaining surface.

## Documented exceptions (intentional non-token colours)

A few colour sets are deliberately **not** tokens — they encode meaning as a fixed palette, not theme surfaces, so they stay constant (or self-contained) across light/dark:

- **Leksindeseis difficulty colours** (amber/green/blue/purple, tiers 1–4) — a meaningful difficulty scale.
- **Stavrolekso crossword grid** (`StavroleksoGrid`) — an intentional "paper" widget: cells stay light (white→stone-100) in *both* themes, with pale paper-tint highlights distinct from the solid feedback tokens.
- **Selection highlights** (the blue "selected clue/cell" in the Stavrolekso maker/player).
- **Status banners** — `amber` = warning, `sky` = info (e.g. NominationModal). These keep their own `dark:` variants by design; they are a small status palette, not brand surfaces. Candidates for future `warning`/`info` tokens if the need recurs.
- **Shell slide-out drawer** (`Shell`) — an intentionally always-dark nav panel (`zinc-*`) that stays dark in *both* themes; there is no "always-dark surface" token, and tokenising it would make it flip to light. Candidate for a `--drawer-*` token pair if a second always-dark surface appears.
- **`FeedbackBanner`** — takes an explicit `theme` prop so each game forces its own banner appearance (Leksiarxeio dark, Leksindeseis light) independent of the app theme; the success/error tints have no surface-tint token equivalents. Tokenising it is a design change (drop the prop + add `success`/`error` surface tokens), not a literal swap — deferred.
- **`FlowerGridPlayground`** — a dev-only design tool (not shipped UI); its chart-style fixed colours are out of scope for the token system.
- **Fixed-yellow chip** — `text-stone-900` on `bg-brand` (pangram found-word chip in leksokipos `styles.ts`): dark text on a fixed-yellow fill must stay dark in *both* themes.

**Enforcement:** the neutral-chrome migration is effectively complete — `noRawPaletteClasses.test.ts` fails the build if any component `.tsx` introduces a literal `stone/zinc/gray/slate/neutral` class outside the allowlisted exception files above. New exceptions require editing that allowlist *and* this section.
