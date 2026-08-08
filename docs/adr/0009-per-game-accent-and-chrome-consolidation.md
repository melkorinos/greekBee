# ADR 0009 — Per-game accent token + shared-chrome consolidation (extends 0008)

**Status**: Accepted — extends [ADR 0008](./0008-css-variable-semantic-theming.md). 0008 established platform-wide semantic tokens and a no-visual-change pilot; this ADR adds the *per-game* dimension and draws the line for what UI gets consolidated.

## Context

After the 0008 token migration, the neutral palette (`surface`/`border`/`foreground`/`muted`) and the `dark:`-pair elimination are essentially done. Two gaps remained, both blocking the goal of *a common feel across all games while keeping each game distinct*:

1. **Per-game accent colour is expressed inconsistently and leaks literal palette values.** Each game's leaderboard injects its own accent as a string prop: Leksokipos `bg-amber-400 text-amber-900` (literal), Leksiarxeio `bg-correct` (borrows the *feedback* token), Leksindeseis/Vrestifrasi `bg-misplaced` + literal `text-purple-600`. The global `--brand`/`--accent` tokens are yellow — really *Leksokipos's* colour — so yellow was simultaneously "the platform brand" and "one game's colour." Borrowing a feedback token (`correct`, `misplaced`) as a brand accent also couples two unrelated meanings: retune the green tile and Leksiarxeio's chrome moves with it.

2. **The shared modal "feel" lives in a copy-pasted shell, not in any recipe.** Every centered modal repeats the same backdrop + card + close-button (`fixed inset-0 … bg-black/40`, `bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6`, `absolute top-4 right-4 text-muted …`). `recipes.ts` had no recipe for the thing that most defines modal consistency, and `recipes.ts` itself had become a grab-bag — ~15 of ~35 exports were imported *only* by Leksokipos, contradicting CLAUDE.md's "no speculative graduation to shared."

## Decision

**A game's brand identity is one accent token; everything else that defines "common feel" — neutrals, spacing, radius, fonts, the modal shell — stays global. Consolidation touches shared chrome only, never gameplay surfaces.**

- **Per-game accent token.** Each game declares a tight trio — `--game-accent`, `--game-accent-foreground` (text on the accent fill), and the `/10` player-row tint derived by opacity — set **once per game** in `globals.css` under a `[data-game="<id>"]` selector. Each game's root wrapper carries `data-game`. All colour *values* stay in `globals.css` (one file, one-line change per game); components reference `bg-game-accent` / `text-game-accent`, never a literal palette class.
  - This is the *brand accent* only (leaderboard pill, header, links). **Game-effect colours** — the `correct`/`present`/`misplaced`/`absent` feedback tokens and the documented-exception palettes (Leksindeseis difficulty tiers, Stavrolekso paper grid, status banners) — are a separate, already-governed category and are **not** folded into the accent mechanism. A game's accent *value* may equal a feedback colour (Vrestifrasi accent = the misplaced purple) but is referenced as `game-accent`, decoupling brand from gameplay meaning.
  - `pillActive` / `playerMark` props on `LeaderboardModalBase` are **deleted**; the base consumes `--game-accent` directly. Net removal of two props and the per-game literal colour strings.

- **One modal primitive.** A single `<Modal variant="sheet" | "center">` owns backdrop, z-index, overlay-click, and close-button. `LeaderboardModalBase` is refactored to consume it (the `sheet` variant); the copy-pasted centered shells (HowToPlay ×2, Nomination, GiveUp, submit modals) wrap the `center` variant, keeping their *content* untouched. Backdrop opacity / radius / animation become a one-place change for every modal.

- **`recipes.ts` means platform-shared.** Leksokipos-only recipes (`colorCenterLetter`, `colorPangram*`, `colorWordChip*`, `foundWord*`, `scoreBar*`, `feedbackPangram/Valid`) move to a Leksokipos-local styles module. Platform `recipes.ts` keeps only genuinely cross-game recipes (buttons, inputs, labels, modal shell, leaderboard rows). Single-utility aliases that merely rename one token (`colorOuterLetter = "text-foreground"`) are inlined — the token is already the single source. Recipes stay flat exported strings; **no typed builder** (Tailwind strings can't be statically validated and `as const` only freezes the string) — the existing `recipes.test.ts` asserts key recipes contain the expected tokens instead.

## Governing rule

**Chrome vs gameplay surface.** Consolidation applies to shared chrome — modals, buttons, inputs, headers, leaderboards, links, profile section. It never applies to gameplay surfaces — grids, tiles, keyboards, the flower/pie display, the crossword paper — which stay game-owned and deliberately distinct. Every future styling change is decided by which side of this line it falls on.

## Consequences

- "Change a game's accent" and "change the modal backdrop" each become a one-line edit, by design.
- Migration is incremental per 0008's precedent: introduce the token + `data-game` wrapper, then convert each game's leaderboard wrapper, then extract the modal primitive. Two idioms coexist during rollout (literal accent strings in not-yet-converted games).

## Implementation (landed)

All four parts shipped on `dev`, each test/eslint/build-green:

1. **Per-game accent** — `--game-accent` / `--game-accent-foreground` defined in `globals.css` with `[data-game]` overrides; the four games' root wrappers carry `data-game`. `LeaderboardModalBase` consumes the token; `pillActive`/`playerMark` props deleted. The player-row tint (`lbRowPlayer`) moved from `bg-brand/10` to `bg-game-accent/10`.
2. **Modal primitive** — `src/components/shared/Modal.tsx` (`center` | `sheet`). Nine modals migrated onto it (5 center, 3 submit, 1 leaderboard sheet), deleting their copy-pasted shells.
3. **Recipes split** — Leksokipos-only recipes moved to `src/components/leksokipos/styles.ts`; `src/styles/recipes.ts` is now genuinely platform-shared; single-token aliases inlined.
4. **`lightTrigger` removed** — it had no production caller (Leksiarxeio never set it); the dead branch and its `border-stone-600 …` literals are gone, and `HowToPlayModal`'s tooltip was tokenised to `bg-inverted`.

## Extension (2026-07-17) — the layout seam and the finished accent map

Pre-redesign seam work (sessions 102–104) completed the chrome consolidation this ADR started:

1. **The game-page frame is two shared components + one token.** `GamePageShell` (server-compatible) owns the canonical `<main data-game=… className="flex flex-1 flex-col items-center gap-2 px-4 pt-4 …">`; `GameHeader` single-sources the title row (`text-2xl font-bold tracking-tight` + `max-w-game` + right-slot children for trophy/help/toggle buttons). The platform column width is `--container-game: 24rem` → `max-w-game`, swept across every shipped `.tsx` (boards, grids, recaps, Shell header, Modal — one knob; the redesign can split modal width out later) and guarded by `noLiteralColumnWidth.test.ts`.
   - **Deliberate exception — Leksokipos keeps a bespoke wrapper.** Its header is a full-bleed `border-b` bar that the canonical `px-4` would inset (a real visual regression). Only its header moved to `GameHeader`. Whether the redesign goes full-bleed-everywhere or padded-everywhere is an open design decision; the exception preserves it. The stavrolekso maker/`[id]` titles also stayed bespoke (not the title+buttons idiom); their wrappers did migrate.
2. **Recipe leaks closed.** `btnModalSubmit` now owns colour/typography/radius/padding only (`flex-1` moved to call sites — the "recipe owns colour, call site owns layout" contract from `btnApprove` applied consistently); every hand-rolled `bg-inverted` primary button routes through a recipe. New recipes: `tooltipBubble` (was pasted byte-identical in 4 files), `cardShell` / `cardShellInteractive` (the platform panel), `btnInfo` (solid info fill), `chipWarning` (the wip chip, colour-only). All contract-tested in `recipes.test.ts`. The four `bg-inverted` *selection-state* toggles (WordCard, ConnectionsBoard, LetterPickerModal, maker) are not buttons and stay call-site-owned.
3. **Accent map complete: 8/8.** `stavrolekso` (sky-600) and `leksikastirio` (indigo-600) got their `[data-game]` rows. Both are **placeholders** — neither page renders accent-consuming chrome today (no leaderboard), so they are invisible plumbing; recolour freely during the redesign.
4. **Shape tokens** (`--radius-card`/`--radius-control`/`--shadow-card`, see ADR 0008's extension) adopted inside `Modal.tsx` + `recipes.ts` only — call sites keep their classes; the classes now read from knobs.

Net effect: the redesign surface is `globals.css` (colour/shape/width), `recipes.ts` (buttons/inputs/cards/tooltips), `Modal.tsx` (popups), `GamePageShell`/`GameHeader` (frame), `GameLeaderboardModal` (leaderboards).
