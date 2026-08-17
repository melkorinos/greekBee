# [LAUNCH] Every Game ends with a Result Panel that shares a summary and a link

**Status:** ready
**Spec:** [docs/adr/0025-round-end-result-panel-and-share.md](../../../docs/adr/0025-round-end-result-panel-and-share.md) — every ruling below is authorised there, including the rejected alternatives. Read it first; this file is the execution list, not the reasoning.

**Build this with `/tdd`.** Six Games, six pure `shareText` builders and one shared surface — the
builders are exactly the kind of pure function that should exist before its caller does, and the
slice list below is already ordered for red-green. The three existing builders
(`topothesies`/`posokanei`/`logopaignio`) are the shape to copy, and their test files are the shape
to copy for the new ones. **Grep `.claude/aiHelper/coverageMap.md` before writing any test file** —
if a function already appears there, extend that file instead of opening a new one.

## Why

Seven Games are live and **one of them ends with a share** (Τοποθεσίες). Λεξοδρομία and Λεξόπλεγμα
already compute a full recap and offer no way to send it anywhere; Λεξιαρχείο and Βρες τη Φράση end
with a one-line banner. And **no share text on the Platform carries a link**, so the summaries that do
exist are untraceable back to the site — a player pastes emoji into Viber and the reader has nowhere
to tap.

`TICKET-10` shipped `opengraph-image` on 2026-08-16. That card renders when a link is posted, and
nothing on the Platform currently posts one. This ticket is the other half of that bet, and it is the
only launch item that makes the soft launch *spread* rather than merely not fail.

## Scope

### Slice 1 — the shared surface

- [ ] Widen `src/components/shared/ShareResultPanel.tsx`: share via **`navigator.share`** when
      available, falling back to the existing clipboard copy. **A user cancelling the native sheet
      rejects the Promise — it must not surface as an error state.** Feature-detect; do not assume.
- [ ] Make the share action the panel's **primary** visual affordance rather than the current
      secondary button. Reuse existing recipes — no new colour strings, and the accent-fill debt noted
      in the file's own header stays exactly where it is.
- [ ] The panel takes the Game's one-line summary row and the link as data, so no Game hand-rolls the
      four-line layout.

### Slice 2 — the shared text spine

- [ ] One place that assembles the four lines: `<Greeklish Game name> <DD/MM>`, the Game's row,
      `Σκορ: N`, the link. Name from the registry `title`; **never a typed literal** (standing rule).
- [ ] The link is `PLATFORM_ORIGIN` + the registry `href`. **No `?puzzle=` date param** — the reason is
      in the ADR and is not a detail to re-litigate.
- [ ] No Platform name in the text. `Leksarxeia` and `Leksiarxeio` are one letter apart.

### Slice 3 — the four new builders

Pure functions in `src/games/<game>/lib/shareText.ts`, zero React imports, spoiler-free by
construction. **One emoji per unit, one line.**

- [ ] **Λεξιαρχείο** — one cell per Length (5 cells): solved / not solved. No `n/6` fractions.
- [ ] **Βρες τη Φράση** — one cell per guess made: `⬛⬛🟩` solved on the third. **Not** a letter grid.
- [ ] **Λεξοδρομία** — ten cells, solved / skipped (`✅` / `⏭️`).
- [ ] **Λεξόπλεγμα** — one green cell per Required Word, plus a count of Extra Words: `🟩…🟩 +4`.
      No `9/9` (it is constant), no spider-web emoji.
- [ ] **Λεξόκηπος** — Rank name only. **No word count, no pangram count.**
- [ ] **Τοποθεσίες** — existing builder gains the identity line and the link; **keeps its two rows and
      its direction arrows**, the one deliberate exception to one-line.

### Slice 4 — wiring Round End per Game

- [ ] **Λεξιαρχείο** — panel when **all five Lengths are resolved, won *or* lost.** Not "all won": a
      lost Length would block it forever, and a lost round shares.
- [ ] **Βρες τη Φράση** — panel on won *and* lost.
- [ ] **Λεξοδρομία** and **Λεξόπλεγμα** — existing recaps become the panel's `children` and **drop
      their own score headings**, so the score is printed once.
- [ ] **Τοποθεσίες** — already wired; verify nothing regresses.

### Slice 5 — Λεξόκηπος, last on purpose

Kept last so that if it slips, the other five still ship as a complete feature.

- [ ] Pop the panel when `isEndgame` fires (top Rank, Daily Puzzle only) — `GameBoard.tsx` already
      computes it and `ScoreBar` already has a seen-once cue to hang off. Dismissible, once per Daily
      Puzzle.
- [ ] Score in the shared text is **live, not a snapshot** — re-sharing later shares the higher number.
- [ ] The header `ShareButton` becomes the result share, and is the way back after dismissing the pop.
      **URL-sharing survives on Custom Puzzles** — sharing the board is the point there, and
      `isEndgame` is daily-only anyway.

### Out of scope — do not widen

- Στavrόλεξο and Λεξικαστήριο: no Score, no daily Puzzle, no capabilities. Not Games with rounds.
- Πόσο κάνει; and Λογοπαίγνιο are `hidden` (ADR 0022). They use the shared panel, so they inherit
  slices 1–2 for free; **do not author their builders or unhide anything.**
- Streak, Leaderboard position, score-against-maximum, dated links, an auto-opening modal for any
  Game but Λεξόκηπος. All explicitly rejected in ADR 0025.
- `globals.css`, `recipes.ts` and shared chrome. The UI redesign runs in separate sessions.

## Done when

- [ ] All six Games reach a Result Panel at their Round End, and each shares four lines carrying a
      working link.
- [ ] Every new builder has a test proving it is **spoiler-free** — no answer word, phrase, place,
      brand or price in the output — and that test is proven non-vacuous by reverting the builder.
- [ ] The clipboard fallback is covered by a unit test. **The native `navigator.share` path is not**,
      and cannot be — it needs one real check in a browser, which is an operator action. Say so in the
      handover rather than implying coverage.
- [ ] `npm run test -- --run`, `npx eslint .` and `npm run build` all clean.
- [ ] `npm run test:e2e` clean — this touches six page clients, which is exactly the standing-rule
      trigger. Baseline is **13 passed / 2 skipped**; if it differs, clear `.next` first, then bisect.
- [ ] `coverageMap.md` updated in the Dream.

## Notes for whoever picks this up

- **20% of Λεξιαρχείο player-days will see the panel** — measured on the live DB 2026-08-17 (7 of 35
  resolve all five Lengths). Accepted with that number on the table. It is beta data that
  `launch-reset.sql` wipes, so re-measure after launch before treating it as the steady state. **Do
  not "fix" it by loosening the trigger** — that alternative was offered and declined.
- **`navigator.share` is the third void-or-Promise trap in a row** for this repo (`router.prefetch`
  returned `void`, jsdom's `play()` returns `undefined`). This one returns a real Promise and
  **rejects on user cancel.** Check the `.d.ts`, do not mock it into the shape you expect.
- No migration, no new column, no new table. Nothing here writes to the database.
