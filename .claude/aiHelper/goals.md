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

- **Seven live games + three wip** — live: Leksokipos, Leksiarxeio, Vres Tin Frasi, Stavrolekso (community crossword browser + maker), Leksodromia (anagram sprint), Leksoplegma (word-web), Topothesies (geography), plus the Leksikastirio word-court. Still `wip: true` in `src/config/games.ts`: **Leksindeseis** (never flipped — it renders under «Υπό κατασκευή»), Πόσο κάνει; and Λογοπαίγνιο (both awaiting real content).
- **Cross-device identity** — device UUID + Profiles + TransferCodes; Google OAuth augments device identity (ADR 0007) and Sign-in Restore adopts the account's DeviceId + merges history (ADR 0012).
- **Achievements** — immutable earned-fact rows (`player_achievements` / `player_pangrams`, ADR 0013); Profile Page + Trophy Case + Lifetime Stats + player-selected Display Badge on leaderboards (2026-07-18 amendment; the 2026-08-06 amendment rejected podium badges and rebuilt the catalog — owed build work is in `.claude/handoffs/badgeIdeas.md`, the art work in `.claude/handoffs/badgeVisualSystem.md`).
- **Community pipeline** — one `communityPuzzleLifecycle` owning submit → approve/reject → consume across Leksiarxeio / Leksindeseis / Vres Tin Frasi (+ never-consumed Stavrolekso); Leksikastirio review tabs.
- **Design system** — CSS semantic tokens + per-game accent (ADR 0008/0009); recipe files; palette guard test.
- **Cost work** — Vercel Fluid CPU mitigations (daily-combo prerender, lazy word-list, Edge routes); Vercel Pro.
- **Leksokipos** — rank ladder + variable soft-cap genius bar; share card.
- **Offline Mode + Score Outbox — BUILT (2026-08-03, ADR 0010), scope reduced by a failed premise**: drawer toggle (plain switch + `?` help modal), `beforeunload` refresh guard, nav confirmation on every in-app link, `useDayChange` suppression + banner, Leksokipos score queueing via `postScoreAwaitable`. **Cross-game offline play does NOT work** — `force-dynamic` routes aren't cached, and prefetching cannot fix it (proven in `e2e/offlineMode.spec.ts`, skipped-and-failing as the acceptance test). What ships is single-page round protection. Multi-game offline needs a service worker → reopens ADR 0010. **PARKED 2026-08-04** — toggle removed from the drawer so the feature is unreachable and production can ship; code left dormant. Revival paths, sizing, manual device pass and cross-game queueing all tracked in `.claude/handoffs/offlineFeature-handoff.md`.

---

## 🎯 Current Focus

**The active epic is public launch readiness**, held in `.claude/handoffs/launch-readiness.md` (charted 2026-07-31 as a wayfinder map, converted to a handoff on 2026-08-06 when wayfinder was retired). The destination is *"nothing is blocking a launch decision"* — the date itself stays the operator's. Read it first; it is the authoritative list of what is open and what has already been decided.

1. **Answer its three open questions**, in order: **the launch checklist** (what "launch-ready" actually requires — everything else is sized against it), **the UI scope verdict** (a few tweaks or the full redesign epic), and **the launch sequencing** (blocked by both). Everything else that map once carried is resolved and folded into its "Decisions already made".
2. **UI redesign (scope undecided — that is open question 2).** The seams are ready (sessions 102–104; ADR 0008/0009 extensions): the whole redesign surface is `globals.css` + `recipes.ts` + `Modal.tsx` + `GamePageShell`/`GameHeader` + `GameLeaderboardModal`. Open decisions to make *during* the redesign: full-bleed vs padded game headers (Leksokipos keeps a bespoke full-bleed wrapper until then), real accent colours for stavrolekso/leksikastirio (current sky/indigo rows are placeholders), and whether to tokenise `FeedbackBanner` + drop its `theme` prop (visible change to Leksiarxeio's banner — see ADR 0008 exceptions).
3. **The tracker** (`.claude/tracker/`) — `issues/` holds one deferred problem, `ISSUE-01`, no disaster-recovery backups. `tickets/` holds two pieces of ready work: `TICKET-01` (`player_milestones`) and `TICKET-02` (catalog rebuild + launch reset, blocked by 01). Resolved files are deleted, per the standing rule. Open *questions* live in the handoff above, not here.
4. **Untracked work that still needs doing** — Πόσο κάνει; content sourcing (nothing survives — see `reflections.md`), badge art (`.claude/handoffs/badgeVisualSystem.md`, decoupled from `TICKET-02` on purpose), and Λογοπαίγνιο's content pool (deliberately out of scope, `.claude/handoffs/logopaignio-content-pool.md`).
5. **E2E coverage** — Playwright is wired (`npm run test:e2e`); grow happy-path coverage per game. Whether the current suite is a launch gate is part of open question 1.
6. **Leksindeseis** — still `wip: true` and its static-fallback pool (`puzzles-connections.json`) is thin with no reminder system (see `reflections.md`).

---

## Constraints
See `CLAUDE.md` standing rules — authoritative source.

---

## Future / Experimental Ideas

_(none currently — add platform ideas here as they surface)_
