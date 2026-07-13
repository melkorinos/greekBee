# Handoff — Leksoplegma (Λεξόπλεγμα): zanagrams-style word-web (READY FOR /tdd)

**Status:** Design grilled 2026-07-13. Zero code written. Name is FINAL: **leksoplegma** (dirs/route/slice/types — locked rule: never renamed).
**Inspiration:** https://zanagrams.com/ — trace hidden words along the drawn paths of a letter graph; found words make unneeded letters/paths vanish until the board fully collapses. **Twist vs original: no timer — Leksokipos-style points; bonus words are the leaderboard differentiator.**

---

## How the original actually works (verified from site source, not blog spam)

Fetched `zanagrams.com` HTML + `assets/i18n.js` + real puzzle JSONs (`puzzles/1.json`, `puzzles_mini/1.json`) on 2026-07-13 — the site 403s normal fetchers; curl with a browser UA works.

- **Board:** 16 letter tiles (4×4), connected by drawn edges. Official how-to: *"Drag across the letters to find the hidden words. You can drag in any direction, but only along the given paths. Letters and paths disappear when they are no longer needed. Words can be found in any order and the puzzle is always still solvable."*
- **Controls:** drag-and-release to submit, OR tap letters one by one then tap the word to submit.
- **Data model (their JSON):** `letters: "UOREHRASLCCEOPRA"` (16 chars, index = tile), `paths: { word: [tileIdx…] }` (authored path per required word; consecutive pairs are always 8-dir Boggle-adjacent on the 4×4), `requiredWords: { word: {definition} }`, `bonusWords: { word: {definition} }` (no paths — traced opportunistically along existing edges), `wordStartTiles` (classic only — hint anchor), `bridgeMode: true`.
- **Modes:** Normal ≈9 required words (mini), Master ≈15 (classic); archive; timer-based (bonus word = −10 s). We drop all timing.

## Grill decisions (user — FINAL)

1. **Puzzle supply: offline generator script** — Node script in `scripts/` (precedent: `batch-generate.ts`, `generate-puzzle-index.mjs`) emits a committed batch (~200) to `src/data/leksoplegma/puzzles-el.json`; daily = `dateToIndex` rotation (`src/lib/puzzleRotation.ts`). No runtime generation, no hand-authoring.
2. **Scoring: Leksokipos-style points, NO timer.** Time is irrelevant everywhere (no clock UI, no time in state).
3. **Scope: single daily, ~9 required words, 16 tiles.** No Master mode, no archive at MVP.
4. **Name: Leksoplegma.**

### Scoring constants — ALL in `src/config/gameRules.ts` under `LEKSOPLEGMA`

```ts
export const LEKSOPLEGMA = {
  REQUIRED_WORDS: 9,            // generator target per puzzle
  GRID_SIZE: 16,                // 4×4
  POINTS_PER_LETTER: 10,        // required word = length × 10 (≈480 base for a puzzle)
  BONUS_WORD_POINTS: 25,        // flat — bonus pools vary per puzzle; flat keeps variance sane
  HINT_COST_POINTS: 25,
  MAX_HINTS_PER_WORD: 1,        // hint = reveal a word's start tile + length (their wordStartTiles idea)
  SCORE_FLOOR: 0,               // hints can never take total below 0
} as const;
```

Total = Σ(required length × 10) + foundBonus × 25 − hints × 25, floored at 0. No MAX_SCORE cap — base varies per puzzle (word lengths differ); leaderboard is per-puzzle daily so that's fair. `is_perfect` = all required found with **zero hints**.

## Decisions taken on my initiative — **user reviews here, not mid-build**

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Collapse rule:** after an accepted required word, delete every tile/edge not present in any *remaining unfound required* word's path. Edges = undirected consecutive pairs of required paths. Bonus words never keep tiles alive | This IS the original's mechanic; keeps solvability invariant trivially true |
| 2 | **Bonus words precomputed at build time** — generator DFS-enumerates all words traceable along the required-edge graph against `words-el.json` (offline only — the 795k dict never ships to the client), minus required words; runtime accepts a trace if it's along currently-live edges and in the list, each once | Leaderboard differentiator under points scoring; zero client dict payload (same reasoning that made Leksodromia exact-match) |
| 3 | **Puzzle end = last required word found.** Bonus hunting happens during play; score posts once at completion via `useScoreSubmission` | Platform pattern (single post); "grab bonuses before finishing" is deliberate strategic tension |
| 4 | **Wrong/duplicate submit: shake / neutral flash, no penalty** | Matches Leksodromia call; no rage cliff |
| 5 | **Interaction: pointer-drag tracing + tap-to-build fallback**, both submitting through the same reducer action (`TRACE_WORD` with a tile-index sequence). Reducer validates edge-adjacency itself — pure, UI-agnostic | Mirrors original's two control schemes; keeps `src/games/leksoplegma/lib/` pure |
| 6 | **Generator constraints:** 4×4, 8-dir adjacency; ~9 required words (mix 4–8 letters, ≥1 of 7–8) from Leksiarxeio `answers-{4..8}.json` (read-only reuse); distinct tiles within a path; every tile used by ≥1 required word (board ends empty); **no two crossing diagonals coexist in the edge union** (dodges the X-crossing render/trace ambiguity their `bridgeMode` handles); accent-free (pools already are) | Quality-gated offline; bad boards rejected and re-rolled |
| 7 | **Leksiarxeio same-day answer guard at loader time:** if today's rotated puzzle contains any of today's Leksiarxeio answers (all lengths), advance to next index | Cross-game answer leak — same invariant Leksodromia enforces, but rotation-time since generation isn't date-coupled |
| 8 | **No definitions in MVP** — original shows a definition per solved word; we have no Greek definitions source. Parked as phase-2 (curated glossary in puzzle JSON) | Content cost >> MVP value |
| 9 | Registry entry ships `wip: true` until polish pass | Leksindeseis/Leksodromia precedent |
| 10 | Score posts as higher-is-better (default sort) — no `sort=asc` needed | Points, not time |

---

## Architecture map (follow platform patterns exactly)

| Piece | Where | Notes |
|-------|-------|-------|
| Generator | `scripts/generate-leksoplegma.mjs` | Emits `src/data/leksoplegma/puzzles-el.json`: `{ id, letters: string(16), paths: Record<word, number[]>, bonusWords: string[] }`. Committed, deterministic given a seed arg |
| Data loader | `src/data/leksoplegma/index.ts` | Static-import puzzles-el.json; `getPuzzleForDate(date)` = `dateToIndex` + initiative-#7 guard. **Update `deploymentReadiness.test.ts`** for the new static import (soul.md step 4) |
| Graph lib | pure `src/games/leksoplegma/lib/graph.ts` | `edgesOf(paths)`, `liveTiles/liveEdges(paths, found)`, `isTraceValid(seq, liveEdges)` — the collapse rule lives here |
| Scoring | pure `computeScore(foundRequired, foundBonus, hintsUsed)` | Constants from `gameRules.ts` only |
| Reducer | pure `src/games/leksoplegma/lib/reducer.ts` | Actions: `TRACE_WORD` (required hit → record+collapse; bonus hit → record once; miss/dup → shake flag), `USE_HINT` (per-word cap, reveals start tile), `RESTORE_STATE`. Zero React imports |
| Route | `src/app/leksoplegma/page.tsx` (server) + `PageClient` | Server resolves date → puzzle; words-el.json nowhere near this game at runtime |
| Persistence | add `"leksoplegma"` to `SliceId` (`src/types/index.ts`) + `PersistenceEnvelope`; `useRoundPersistence` | Persist `{ puzzleId, foundRequired: string[], foundBonus: string[], hintsUsed: string[], status }` |
| Score post | `useScoreSubmission` on completion | Single post; `is_perfect` = zero hints |
| Registry | `src/config/games.ts` | New `GAME_REGISTRY` entry — nav/picker follow automatically |
| Styling | semantic tokens only; per-game `--game-accent` via `[data-game="leksoplegma"]` in `globals.css` (ADR 0009); recipes from `src/styles/recipes.ts`; shared `Modal` for HowToPlay | `noRawPaletteClasses.test.ts` enforces. SVG edge lines use token-driven `stroke-[color:var(--…)]` — check allowlist need early |
| Accents | board letters accent-free from pools; traces are tile-picks so no free-text input to normalize | locked no-accents invariant holds by construction |

**UI sketch (MVP):** 4×4 tile board with SVG edge lines underneath; drag (pointer events, capture) highlights the path + shows the building word above; release submits; tap-mode builds the same sequence with a tap-to-submit word chip. Found-required list with points; bonus counter ("Έξτρα λέξεις: 3 · +75"); hint button showing cost; live total; end recap: all 9 words + bonus haul + score.

---

## /tdd slice plan (suggested order)

1. **Graph lib** — edge derivation, live-tile/edge collapse after each found word, trace validation (adjacency along live edges, no tile reuse within trace).
2. **Scoring** — required/bonus/hint math, floor, is_perfect predicate.
3. **Reducer** — TRACE_WORD required/bonus/miss/dup, hint cap, terminal state, RESTORE_STATE.
4. **Generator** (script, its own vitest file) — constraint checks: 9 words, all tiles covered, adjacency, no crossing-diagonal pair, no identity issues, bonus enumeration correctness on a fixture board.
5. **Loader** — rotation determinism + Leksiarxeio same-day guard.
6. **Components** — board/trace interaction (fire reducer with sequences; don't unit-test pointer physics — test the seams), HowToPlay, recap.
7. **Wiring** — route, registry, slice, score post, deploymentReadiness.

Gates after every slice (standing rules): `npm run test -- --run` · `npx eslint .` · `npm run build` — all green. PowerShell only. Post-feature protocol in `soul.md` mandatory (incl. log.md entry ≤250 lines).

## Suggested skills for the pickup session

- `/aihelper` — context reload first
- `/tdd` — the build (this doc is the spec)
- `/prototype` — recommended BEFORE slice 6 for the drag-trace feel (new interaction paradigm for the platform: first pointer-drag game)

## Out of scope (parked)

Master mode + archive (generator takes a size param later) · definitions per word (needs a Greek glossary source) · share card · achievements (`achievementTuning.ts` comes with that epic) · community-submitted boards · timer of any kind (explicitly rejected in grill).
