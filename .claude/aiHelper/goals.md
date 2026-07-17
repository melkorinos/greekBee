# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game Greek word game platform where all seven games — Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi, Stavrolekso, Leksodromia, and Leksoplegma — coexist cleanly, sharing a shell, persistence layer, cross-device identity (device + optional Google), and design foundation — plus the Leksikastirio community word-court — without any game's logic bleeding into another's.

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
- **Achievements** — immutable earned-fact rows (`player_achievements` / `player_pangrams`, ADR 0013); Profile Page + Trophy Case + Lifetime Stats.
- **Community pipeline** — one `communityPuzzleLifecycle` owning submit → approve/reject → consume across Leksiarxeio / Leksindeseis / Vres Tin Frasi (+ never-consumed Stavrolekso); Leksikastirio review tabs.
- **Design system** — CSS semantic tokens + per-game accent (ADR 0008/0009); recipe files; palette guard test.
- **Cost work** — Vercel Fluid CPU mitigations (daily-combo prerender, lazy word-list, Edge routes); Vercel Pro.
- **Leksokipos** — rank ladder + variable soft-cap genius bar; share card. (**Offline Lock + Score Outbox are NOT built** — design complete only: ADR 0010 + `offlineFeature-handoff.md`; no `useOfflineLock`/outbox code exists.)

---

## 🎯 Current Focus

No single active epic. Recent sessions have been architecture reviews, a DB-schema review, and the Leksokipos soft cap. Standing priorities / open threads:

1. **Ship dev → main** — Leksodromia + Leksoplegma are the two games about to land on `main`. Manual browser play-through required before merge.
2. **Open tracker issues** — `02` disaster-recovery backups (no PITR, shared dev/prod project — automate an off-site dump + decide the DB split), `03` unit tests never run in CI, `04` Stavrolekso edit PIN readable by anon (ready-for-agent), `05` words-2/3.json missed by the nomination re-sync.
3. **E2E coverage** — Playwright is now wired (`npm run test:e2e`); grow happy-path coverage per game.
4. **Leksindeseis static-fallback supply** — thin `puzzles-connections.json` pool, no reminder system (see `reflections.md`).

---

## Constraints
See `CLAUDE.md` standing rules — authoritative source.

---

## Future / Experimental Ideas

_(none currently — add platform ideas here as they surface)_
