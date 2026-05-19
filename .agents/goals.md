# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game Greek word game platform where Spelling Bee, Wordle GR, and Connections coexist cleanly — sharing a shell, persistence layer, and design foundation — without any game's logic bleeding into another's.

---

## ✅ Phases 1–3 — COMPLETE

| Phase | Summary | Final tests |
|---|---|---|
| 1 — Foundation | Folder structure, Shell + routing, `useGameStore`, types split | ~50 |
| 2 — Wordle GR | `evaluateGuess`, reducer, daily answer, curated answer pool | 143 |
| 2.5 — Theming | Dark Wordle + Shell, light SB + picker, no `dark:` classes | 151 |
| 3 — Connections | Full game, reducer, GroupGrid, FeedbackBanner graduated | 167 |

---

## ✅ Phase 4 Polish — completed items

| Item | Status |
|------|--------|
| Puzzle quality filter (≥2 vowels, ≥2 consonants, vowel centre, ≥1 pangram) | ✅ |
| Greeklish URL encoding (`src/lib/greeklish.ts`) | ✅ |
| Letter picker modal + random puzzle quality rules | ✅ |
| Word suggestion flow (Supabase `word_suggestions`) | ✅ |
| Per-puzzle leaderboard (Supabase `scores`, `POST/GET /api/scores`) | ✅ |
| Leaderboard 7-day pill strip (replaces calendar) | ✅ |
| Leaderboard play-past-puzzle routing fix | ✅ |
| Mobile layout fixes | ✅ |

---

## 🎯 Current Focus — Spelling Bee Polish

Priority order (work top-down):

1. **Rank badge on ScoreBar** — render the current rank label (Αρχάριος → Βασίλισσα) as a styled badge inside the score bar, not just plain text.
2. **Share score** — after completing the game, offer a shareable score card (rank + score + date) that copies to clipboard.
3. **Home page "played today" badge** — read `useGameStore` to show ✓ on each game card if played today.
4. **Spelling Bee stats modal** — device-local all-time stats: games played, best rank, total words. Read from localStorage.
5. **E2E test (Playwright)** — at least one Spelling Bee happy-path: load today's puzzle → type valid word → see it in found list.
6. **Wordle length variants (3–8)** — generate `words-N.json` + `answers-N.json`, add `/wordle/[length]` route.
7. **Visual rebrand** — introduce Tailwind theme config; decouple from NYT aesthetic.

---

## Constraints (never violate)
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`
- Each game only reads/writes its own `useGameStore` slice
- No component graduates to `shared/` speculatively — only when two games need it
- `npm run test -- --run`, `npm run build`, `npx eslint .` must all pass (0 errors) after every change
- No inline styles — Tailwind utility classes only
- Do not install new dependencies without explicit approval
- Keep `.agents/log.md` under 250 lines — condense older entries before adding new ones
