# Agent Log — Greek Word Games Platform

> Entries newest-first. Full detail for the two most recent sessions; older sessions one-liner.
> **Rule:** keep this file under 250 lines — condense older entries before adding new ones.

---

## 2026-05-19 — Session 20: Leaderboard 7-Day Strip + Routing Bug Fix ✅

**Outcome:** 568 tests (35 files) · build clean · 0 ESLint errors.

### Bug fixed — wrong puzzle loaded from leaderboard play link
Root cause: `page.tsx` called `getPuzzleById(date, "el")` but puzzle IDs have a `-el` suffix; plain date never matched → silently fell back to today's puzzle.
Fix: replaced `getPuzzleById` with `getPuzzleForDate` (matches `p.date`).

### UI redesign — calendar → rolling 7-day pill strip
- `getRecentPuzzleDates(n, language)` added to `src/data/spelling-bee/index.ts`; returns last `n` puzzle dates ≤ today, newest-first. Re-exported from `src/data/index.ts`.
- `[center]/[outer]/page.tsx` calls `getRecentPuzzleDates(7)`, passes as `recentPuzzleDates` prop to `GameBoard`, forwarded to `LeaderboardModal` as `recentDates`.
- `LeaderboardModal`: date picker replaced with horizontal pill strip. Today pill shows "Σήμερα"; past pills show Greek day abbrev + day number. `GREEK_DAYS` constant at module level.

### DB cleanup
After every successful POST upsert: fire-and-forget `.delete().lt("puzzle_id", cutoffStr)` removes scores older than 7 days.

### ESLint
Added `// eslint-disable-next-line` on all 5 pre-existing `as any` casts in `route.ts`. Now 0 errors.

### Tests (+7 net)
- `spellingBeeDataLoader.test.ts` +8: 2 routing regression + 6 `getRecentPuzzleDates`
- `leaderboardModal.test.tsx` rewritten: pill strip tests (closed / 7-pills / today-label / selection / play-link × 3 / display-name × 4)
- `scoresRoute.test.ts`: mock chain +`delete`/`lt`; 2 POST tests updated to enqueue cleanup result

---

## 2026-05-18 — Session 19: Leaderboard Date Restriction + Display Name Fix ✅

**Outcome:** 559 tests · build clean.

- `max={today}` on date input; future-date guard on play link.
- Display name reset bug: Supabase RLS blocked UPDATE path. Fix: `CREATE POLICY "anon update"` (run in dashboard).
- New test file `leaderboardModal.test.tsx` (11 tests).

---

## Earlier sessions (one-liner each)

| Session | Date | Outcome | Tests |
|---------|------|---------|-------|
| 18 — 🏆 button + style tokens | 2026-05-18 | `getCuratedPuzzleByLetters()`; shared `styles.ts` tokens; `not_in_list` includes word | 479 |
| 17 — Per-puzzle leaderboard | 2026-05-18 | `POST/GET /api/scores`; `useLeaderboard` hook; `LeaderboardModal`; Supabase `scores` table | 475 |
| 16 — Supabase word suggestions | 2026-05-18 | `getSupabaseClient()`; `getOrCreateDeviceId()`; `POST /api/suggest-word` wired; `.env.local.example` | 445 |
| 15 — Suggestion flow + UI polish | 2026-05-15 | `SuggestWordModal`; `suggestions.ts`; inline ⏎ submit in `WordInput`; landing page rewrite | 430 |
| 14 — Puzzle quality filter | 2026-05-14 | `meetsQuality()` + `hasPangram()`; `puzzles-el.json` regenerated (1008 puzzles) | 389 |
| 13b — Random puzzle quality | 2026-05-14 | `pickRandom7()` guarantees vowel centre + ≥2 vowels + ≥2 consonants | 374 |
| 13 — Codebase review | 2026-05-14 | Removed duplicate `normaliseChar`; stale docs fixed | 372 |
| 12 — LetterPickerModal | 2026-05-14 | Shared `LetterPickerModal`; `NewPuzzleButton` wired; `ShareButton` icon-only | 372 |
| 11 — Greeklish URLs | 2026-05-14 | `src/lib/greeklish.ts`; bijective codec; backward-compat redirect | 352 |
| 10 — Mobile fixes | 2026-05-14 | `overflow-x:hidden`; Keyboard `flex-1`; `HowToPlayModal` scroll-safe | 299 |
| 9 — Keystroke bugs | 2026-05-14 | Wordle cap message; stable `keyHandlerRef`; `FoundWordsList` memo | 289 |
| 8 — No-accent invariant | 2026-05-13 | `normalizeLetters` at every entry point; `noAccents.test.ts` (20 tests); canonical redirect | 277 |
| 7 — Test gap fill | 2026-05-13 | 58 new tests; `parseCustomUrl` extracted; `deploymentReadiness` updated | 257 |
| 1–6 — Foundation + Wordle + Theming + Connections | 2026-05-12 | Phases 1–3 complete | 199 |
