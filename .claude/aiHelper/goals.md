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

- **Seven live games + three hidden** — live: Leksokipos, Leksiarxeio, Vres Tin Frasi, Stavrolekso (community crossword browser + maker), Leksodromia (anagram sprint), Leksoplegma (word-web), Topothesies (geography), plus the Leksikastirio word-court. `hidden: true` in `src/config/games.ts` since 2026-08-12 (ADR 0022), listed nowhere but still playable by direct URL: **Leksindeseis** (finished, not launching), Πόσο κάνει; and Λογοπαίγνιο (both awaiting real content).
- **Cross-device identity** — device UUID + Profiles + TransferCodes; Google OAuth augments device identity (ADR 0007) and Sign-in Restore adopts the account's DeviceId + merges history (ADR 0012).
- **Achievements** — immutable earned-fact rows (`player_achievements` + the unified `player_milestones`, ADR 0013); Profile Page + Trophy Case + Lifetime Stats + player-selected Display Badge on leaderboards. **Catalog rebuilt 2026-08-07**: five badges, every one tiered, with Πρώτα Βήματα and Θεριστής retired and `leksokipos-tzimani` revived — see ADR 0013's 2026-08-07 amendment. `badgeIdeas.md` is discharged and deleted. **Badge art SHIPPED 2026-08-10** (`TICKET-03`, s144): drawn SVG marks in tier-coloured frames replace every emoji — see ADR 0013 §7. **Not live until the after-hours deploy**, and the frozen-id exceptions are not legitimate until `launch-reset.sql` runs on release day.
- **Community pipeline** — one `communityPuzzleLifecycle` owning submit → approve/reject → consume for Leksindeseis (+ never-consumed Stavrolekso); Leksikastirio review tabs. Leksiarxeio and Vres Tin Frasi lost submission on 2026-08-20 with both queues empty (ADR 0027).
- **Design system** — CSS semantic tokens + per-game accent (ADR 0008/0009); recipe files; palette guard test.
- **Cost work** — Vercel Fluid CPU mitigations (daily-combo prerender, lazy word-list, Edge routes); Vercel Pro.
- **Leksokipos** — rank ladder + variable soft-cap genius bar; share card.
- **Offline Mode + Score Outbox — BUILT (2026-08-03, ADR 0010), scope reduced by a failed premise**: drawer toggle (plain switch + `?` help modal), `beforeunload` refresh guard, nav confirmation on every in-app link, `useDayChange` suppression + banner, Leksokipos score queueing via `postScoreAwaitable`. **Cross-game offline play does NOT work** — `force-dynamic` routes aren't cached, and prefetching cannot fix it (proven in `e2e/offlineMode.spec.ts`, skipped-and-failing as the acceptance test). What ships is single-page round protection. Multi-game offline needs a service worker → reopens ADR 0010. **PARKED 2026-08-04** — toggle removed from the drawer so the feature is unreachable and production can ship; code left dormant. Revival paths, sizing, manual device pass and cross-game queueing all tracked in `.claude/handoffs/offlineFeature-handoff.md`.

---

## 🎯 Current Focus

**The phase is LAUNCH — target on or about 27 August 2026**, sequenced 2026-08-20 when the last open
question closed. The order of work, the release-day steps and the explicit not-doing list live in
`docs/launch-runbook.md`; read it first, and read the tracker folder for what is still open. The date
is the operator's and is not hard.

1. **Both launch questions are answered.** Question 1 (2026-08-11): launch is a **soft launch**, which
   is what made the checklist finite. Question 2 (2026-08-20): the run is the `dev → main` merge with
   its play-through → release day → a week of daily Vercel error checks (ADR 0023). Both tickets that
   came before it closed on 2026-08-20 — the Round-End Result Panel, and `TICKET-11`'s offsite backup
   (what survives of it is two unscheduled items in `ISSUE-01` §1, neither gating the date). `.claude/handoffs/launch-readiness.md` is deleted; the runbook replaced it.
2. **The launch tickets.** **What is open is read from `.claude/tracker/`, never from here** — this
   file kept a per-ticket status table until it went stale twice. The shape: five tickets came out of
   question 1 and the shipped ones are deleted per the standing rule; **no ordering constraints remain
   between any of them.** The last piece of agent work, the Round-End Result Panel, shipped
   2026-08-20 (ADR 0025); what is left of it is an operator check of the native share sheet on a phone.
3. **Sound Cues are DONE (2026-08-17).** `TICKET-04` built the primitive (ADR 0021), `TICKET-05` gated it and then landed the audio: two committed MP3s plus a synthesized `wordFound`, provenance recorded, and `FEATURE_FLAGS.soundCues` flipped **on**. Both ticket files are deleted. What survives is an operator ear check on a phone — and, because the flag is on, the Shell header is four buttons wide again at 320 px with nothing guarding it (`reflections.md`).
4. **Operator-driven work that is deliberately outside the launch sequence** — the **UI redesign**, run in separate sessions. The **platform logo** stopped being a separate thread in s154: the icon picked from the candidates page *is* the mark, so it lived inside `TICKET-10` — which shipped it and was closed 2026-08-17, leaving nothing to track. Πόσο κάνει; and Λογοπαίγνιο content are **no longer pending** — both Games are `hidden` (ADR 0022), so their content is out of scope until unhiding is considered.
5. **Game icons (`.claude/handoffs/game-icon-system.md`, 2026-08-10)** — replace the eight live games' emoji with drawn, **coloured** icons, the way `TICKET-03` did for badges. Nothing designed yet; the handoff carries the scope, the code findings and the open questions for a grill. Settled already: scope is the eight `wip:false` rows, the six-petal flower stays with the Τζιμάνι *badge* so Leksokipos needs a different image, and **colour is unconstrained** — which means it does **not** settle item 2's placeholder accents for stavrolekso/leksikastirio, and the three neighbouring blues (`blue-700`/`sky-600`/`indigo-600`) become the icons' own problem to separate.
6. **E2E coverage** — Playwright is wired (`npm run test:e2e`). **Settled 2026-08-11:** the launch gate is the *existing* suite green, not a bigger one; growing happy-path coverage per game is deferred as `ISSUE-03`.
7. **Leksindeseis** — `wip: true` and now `hidden: true` (`TICKET-06` shipped 2026-08-12, ADR 0022). Its static-fallback pool is **one placeholder puzzle**, measured 2026-08-11, with no reminder system (see `reflections.md`). Parked while the Game is hidden; live again the moment unhiding is considered — and unhiding is a checklist (flag, accent row, capabilities, content supply), not a one-line edit.

---

## Constraints
See `CLAUDE.md` standing rules — authoritative source.

---

## Future / Experimental Ideas

_(none currently — add platform ideas here as they surface)_
