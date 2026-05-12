# Agent Memory — Greek Word Games Platform

## Project Context
- **Repo:** `c:\repos\try` (or wherever cloned)
- **Stack:** Next.js 15 · TypeScript · Tailwind CSS · Vitest + RTL
- **Language focus:** Greek (`el`) primary, English (`en`) infrastructure exists but is dormant
## Current state (as of 2026-05-12):** Two live games: Spelling Bee + Wordle GR (5-letter)

## Key Decisions Made (Session 2026-05-12)

### Games Roadmap
| Game | Status | Notes |
|------|--------|-------|
| Spelling Bee | Live | Greek, centerLetter + outerLetters honeycomb |
| Wordle GR | Live (5-letter) | 6 guesses, 5-letter only for now; architecture supports 3–8 letters |
| Connections | Planned | 16 words / 4 groups of 4, hand-curated by operator |

### Architecture Decisions
| Topic | Decision |
|-------|----------|
| Navigation | Hamburger slide-out menu in shared Shell, available from every game screen |
| Routing | `/spelling-bee`, `/wordle`, `/wordle/[length]`, `/connections`, `/` = game picker |
| Components | `src/components/shared/` for cross-game primitives; game-specific stay co-located |
| Persistence | Single `wordgames:state` localStorage key; typed envelope `{ "spelling-bee": ..., "wordle": ..., "connections": ... }`; `useGameStore` is the only code that touches localStorage |
| Scripts | Per-game; Connections is manual JSON only |
| Styling | **Per-game theming** — Wordle = dark (`bg-zinc-900` on page `<main>`, `text-stone-100` inherited by all descendants); Spelling Bee + Shell header = light (`bg-white` / `bg-zinc-50`); no system-preference dark mode; theming is explicit per-route via root element className. All `dark:` Tailwind classes removed from Wordle components — unconditional classes only. |
| Scoring | Per-game; no unified rank ladder yet |

### Planned Folder Structure
```
src/
  app/
    layout.tsx                        ← Shell with hamburger nav
    page.tsx                          ← Game picker
    spelling-bee/page.tsx
    wordle/page.tsx                   ← Variant picker (3–8 letters)
    wordle/[length]/page.tsx
    connections/page.tsx
  components/
    shared/                           ← Shell, HamburgerMenu, FeedbackMessage, Modal, ScoreDisplay
    spelling-bee/                     ← GameBoard, HoneycombGrid, WordInput, ScoreBar, etc.
    wordle/                           ← GuessGrid, Tile, Keyboard, VariantPicker
    connections/                      ← GroupGrid, WordCard, CategoryReveal
  games/
    spelling-bee/
      lib/                            ← validation, scoring, ranking, pangram, normalize (moved from src/lib)
      hooks/                          ← useSpellingBeeState, gameReducer (moved from src/hooks)
      types.ts
    wordle/
      lib/                            ← evaluateGuess, isValidGuess, scoreWordle
      hooks/                          ← useWordleState, wordleReducer
      types.ts
    connections/
      hooks/                          ← useConnectionsState
      types.ts
  data/
    spelling-bee/                     ← puzzles-el.json, puzzles-en.json (moved)
    wordle/                           ← puzzles-wordle-el.json
    connections/                      ← puzzles-connections.json (manual)
  hooks/
    useGameStore.ts                   ← unified localStorage envelope
  types/
    index.ts                          ← Language, GameId, PersistenceEnvelope only
```

## Known Tech Debt
1. No cross-player leaderboard (localStorage only)
2. Spelling Bee puzzle quality filter missing (no vowel/consonant balance enforcement)
3. English puzzle path dormant — `puzzles-en.json` can be cleaned up
4. `usePersistence` does not save `puzzleMaxScore`
5. No E2E tests (no Playwright/Cypress)
6. **`puzzles-el.json` validWords not yet regenerated from normalized dict** — validation.ts still normalizes them at index-build time; after re-running the batch generator against the new `words-el.json`, the `.map(normalizeLetters)` call in `getPuzzleIndex` can be removed
7. **Wordle length variants deferred** — architecture supports it; word lists for 3,4,6,7,8 not yet generated

## Wordle Answer Pool Decision (2026-05-12)
- **`answers-5.json`** (~3,839 words) — curated everyday words; used for daily answer selection
- **`words-5.json`** (~9,568 words) — full valid-guess list; used for guess validation
- `answers-5.json` is committed to git (tracked, manually curated over time)
- `words-5.json` is gitignored (generated artifact, regenerate with `normalize-wordlist.mjs`)
- Curation script: `scripts/curate-answers.mjs` — morphological-ending whitelist + structural filters

## Dictionary Normalisation Decision (2026-05-12, updated)
- **`words-el.raw.json`** is the **canonical immutable source** (826,268 words, original accented) — gitignored
- **`words-el.json`** is committed to git (811,614 words, lowercase, no accents — pre-normalised convenience copy)
- **`src/data/wordle/words-*.json`** are generated per-length word lists — gitignored
- `scripts/normalize-wordlist.mjs` reads from `words-el.raw.json`, normalizes on the fly, filters by length
- `scripts/normalize-el-dict.mjs` was the one-time migration script; can re-run if the raw dictionary is replaced

## Files to Be Aware Of
- `src/types/index.ts` — canonical types; will need to fork per-game types into `src/games/*/types.ts`
- `src/lib/` — all pure game logic; will move to `src/games/spelling-bee/lib/`
- `src/hooks/usePersistence.ts` — will be replaced by `useGameStore.ts`
- `src/data/index.ts` — data loader; will need per-game variants
- `scripts/` — puzzle generation; will reorganise into `scripts/spelling-bee/` and `scripts/wordle/`
- `.github/copilot-instructions.md` — Copilot context file; keep in sync with architecture changes
