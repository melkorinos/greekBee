# Agent Memory — Greek Word Games Platform

## Project Context
- **Repo:** `c:\repos\try` (or wherever cloned)
- **Stack:** Next.js 15 · TypeScript · Tailwind CSS · Vitest + RTL
- **Language focus:** Greek (`el`) primary, English (`en`) infrastructure exists but is dormant
- **Current state (as of 2026-05-12):** Single Spelling Bee game, everything flat under `src/`

## Key Decisions Made (Session 2026-05-12)

### Games Roadmap
| Game | Status | Notes |
|------|--------|-------|
| Spelling Bee | Live | Greek, centerLetter + outerLetters honeycomb |
| Wordle GR | Planned | 6 guesses, 6 length variants (3–8 letters), Greek word list |
| Connections | Planned | 16 words / 4 groups of 4, hand-curated by operator |

### Architecture Decisions
| Topic | Decision |
|-------|----------|
| Navigation | Hamburger slide-out menu in shared Shell, available from every game screen |
| Routing | `/spelling-bee`, `/wordle`, `/wordle/[length]`, `/connections`, `/` = game picker |
| Components | `src/components/shared/` for cross-game primitives; game-specific stay co-located |
| Persistence | Single `wordgames:state` localStorage key; typed envelope `{ "spelling-bee": ..., "wordle": ..., "connections": ... }`; `useGameStore` is the only code that touches localStorage |
| Scripts | Per-game; Connections is manual JSON only |
| Styling | No changes yet; Tailwind utilities as-is; no magic hex values introduced |
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

## Known Tech Debt (pre-existing)
1. No cross-player leaderboard (localStorage only)
2. Puzzle quality filter missing (no vowel/consonant balance enforcement)
3. English puzzle path dormant — `puzzles-en.json` can be cleaned up
4. `usePersistence` does not save `puzzleMaxScore`
5. No E2E tests (no Playwright/Cypress)

## Files to Be Aware Of
- `src/types/index.ts` — canonical types; will need to fork per-game types into `src/games/*/types.ts`
- `src/lib/` — all pure game logic; will move to `src/games/spelling-bee/lib/`
- `src/hooks/usePersistence.ts` — will be replaced by `useGameStore.ts`
- `src/data/index.ts` — data loader; will need per-game variants
- `scripts/` — puzzle generation; will reorganise into `scripts/spelling-bee/` and `scripts/wordle/`
- `.github/copilot-instructions.md` — Copilot context file; keep in sync with architecture changes
