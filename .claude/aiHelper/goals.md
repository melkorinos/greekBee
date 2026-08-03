# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game **Greek games platform** — beginning with word games (Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi, Stavrolekso, Leksodromia, Leksoplegma) and now widening beyond the dictionary with Topothesies (geography) — where every game coexists cleanly, sharing a shell, persistence layer, cross-device identity (device + optional Google), and design foundation — plus the Leksikastirio community word-court — without any game's logic bleeding into another's.

---

## ✅ Phases 1–3 — COMPLETE

| Phase | Summary | Final tests |
|---|---|---|
| 1 — Foundation | Folder structure, Shell + routing, `useGameStore`, types split | ~50 |
| 2 — Leksiarxeio | `evaluateGuess`, reducer, daily answer, curated answer pool | 143 |
| 2.5 — Theming | Dark Leksiarxeio + Shell, light Leksokipos + picker, no `dark:` classes | 151 | *(superseded by session 36–37: full white mode + manual dark toggle via ADR 0002)* |
| 3 — Leksindeseis | Full game, reducer, GroupGrid, FeedbackBanner graduated | 167 |

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
| White/light mode for all games (leksiarxeio converted, Shell header lightened) | ✅ |
| Dark/light mode toggle — `useTheme` hook, `.dark` on `<html>`, `@custom-variant dark` in globals.css, `localStorage["theme-preference"]` (ADR 0002) | ✅ |
| Leksikastirio UX polish — Greeklish name, sidebar community section, compact admin ✓/✕ buttons | ✅ |

---

## ✅ Beyond Phase 4 — shipped since (see `log.md` for session detail)

- **7 live games** — Vres Tin Frasi, Stavrolekso (community crossword browser + maker), Leksodromia (anagram sprint), and Leksoplegma (word-web) joined the original three.
- **Cross-device identity** — device UUID + Profiles + TransferCodes; Google OAuth augments device identity (ADR 0007) and Sign-in Restore adopts the account's DeviceId + merges history (ADR 0012).
- **Achievements** — immutable earned-fact rows (`player_achievements` / `player_pangrams`, ADR 0013); Profile Page + Trophy Case + Lifetime Stats + player-selected Display Badge on leaderboards (2026-07-18 amendment; further badge ideas parked in issue 12).
- **Community pipeline** — one `communityPuzzleLifecycle` owning submit → approve/reject → consume across Leksiarxeio / Leksindeseis / Vres Tin Frasi (+ never-consumed Stavrolekso); Leksikastirio review tabs.
- **Design system** — CSS semantic tokens + per-game accent (ADR 0008/0009); recipe files; palette guard test.
- **Cost work** — Vercel Fluid CPU mitigations (daily-combo prerender, lazy word-list, Edge routes); Vercel Pro.
- **Leksokipos** — rank ladder + variable soft-cap genius bar; share card.
- **Offline Mode + Score Outbox — BUILT (2026-08-03, ADR 0010)**: drawer toggle, activation prefetch, `beforeunload` refresh guard, nav confirmation off the prefetched set, `useDayChange` suppression + banner, and Leksokipos score queueing via `postScoreAwaitable`. **Awaiting the operator's manual DevTools-offline pass** (handoff §13). **Item D is a GO/NO-GO, not a checklist line:** if prefetched routes evict from the Next router cache during a long offline session, prefetching is the wrong mechanism and ADR 0010's "no service worker" call reopens — run D before merging to `main`. Cross-game score queueing is deferred (issue 15).

---

## 🎯 Current Focus

No single active epic. Recent sessions have been architecture reviews, a DB-schema review, and the Leksokipos soft cap. Standing priorities / open threads:

1. **Ship dev → main** — Leksodromia + Leksoplegma are the two games about to land on `main`. Manual browser play-through required before merge. Sessions 102–104 also shipped small deliberate visual shifts to eyeball in that play-through: leksindeseis/stavrolekso page rhythm (canonical frame), stavrolekso maker CTAs (`py-3`→`py-2`/`text-sm`), NominationModal blocked/accepted banner hues (rose→red, emerald→green).
2. **UI redesign (queued, next big epic)** — the seams are ready (sessions 102–104; ADR 0008/0009 extensions): the whole redesign surface is `globals.css` + `recipes.ts` + `Modal.tsx` + `GamePageShell`/`GameHeader` + `GameLeaderboardModal`. Open decisions to make *during* the redesign: full-bleed vs padded game headers (Leksokipos keeps a bespoke full-bleed wrapper until then), real accent colours for stavrolekso/leksikastirio (current sky/indigo rows are placeholders), and whether to tokenise `FeedbackBanner` + drop its `theme` prop (visible change to Leksiarxeio's banner — see ADR 0008 exceptions).
3. **Open tracker issues** — see `.claude/issue-tracker/issues/` for the current list (03/04/05/06/07/08 closed in sessions 96–101; 09/10 filed since).
4. **E2E coverage** — Playwright is now wired (`npm run test:e2e`); grow happy-path coverage per game.
5. **Leksindeseis static-fallback supply** — thin `puzzles-connections.json` pool, no reminder system (see `reflections.md`).

---

## Constraints
See `CLAUDE.md` standing rules — authoritative source.

---

## Future / Experimental Ideas

_(none currently — add platform ideas here as they surface)_
