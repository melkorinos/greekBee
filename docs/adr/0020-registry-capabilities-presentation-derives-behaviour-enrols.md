# ADR 0020 — Presentation derives from the Game Registry; behaviour enrols

**Status:** accepted (2026-08-08)
**Supersedes in part:** commit `9c9293b` ("Derive the Game-keyed lists from GAME_REGISTRY instead of retyping them") — for the behaviour lists only.

## Context

`GAME_REGISTRY` (`src/config/games.ts`) is the single source of truth for every Game on the
Platform. Commit `9c9293b` made five Game-keyed surfaces derive from it rather than retype it,
after `topothesies` went missing from the drawer in session 121 because the drawer's id array was
hand-written. That was the right fix for a hand-typed list, and the drawer derivation stays.

But every one of those derivations was *subtractive* — each surface spelled itself "every Game
except these". Registering a Game therefore enrolled it in six capabilities at once, including two
that write to the shared production database. Opt-out is a defensible default for how a Game
*looks*. It is the wrong default for what a Game *does*.

The cost was not hypothetical. `posokanei` and `logopaignio` both ship `wip:true` with a single
placeholder puzzle, and both were posting Scores into production `game_scores` on every play, with
a leaderboard modal and a picker 🏆 button advertising boards full of scores against fake prices
and one fake brand. `game_scores` is append-forever (never pruned), so those rows are permanent.

Nothing about this was silent — someone wrote the `useScoreSubmission` call and someone wrote the
`GAME_LEADERBOARD_CONFIG` row. The type system simply had no way to object, because the unions
said every registered Game was welcome.

## Decision

**Draw the line at presentation versus behaviour.**

**Presentation derives.** Drawer nav, picker card, SEO description, `[data-game]` accent, and
Offline Mode stay derived from the registry rows. A new Game is visible by default, and flipping
`wip` is still one edit. Offline Mode in particular keeps deriving from `wip` (ADR 0010) — making
it opt-in would have added a line to every finished Game and broken the one-edit flip.

**Behaviour enrols.** A `capabilities: readonly GameCapability[]` field on each registry row, with
two members today:

- `scores` — may post rows to `game_scores`; widens `ScoreSubmissionGameId`.
- `leaderboard` — has a board to rank them on; widens `LeaderboardGameId`, and so requires a row in
  `GAME_LEADERBOARD_CONFIG`.

A new Game is **inert by default**: it writes nothing until its registry row says so.

`NON_POSTING_IDS` and `NO_LEADERBOARD_IDS` are deleted. The picker's hand-typed trophy-button id
list — the surface that had `posokanei` and `logopaignio` advertising boards — derives from the
capability instead.

## Consequences

- The registry row states the whole truth about a Game. The wip→live flip is one edit that grants
  visibility and capability together.
- `Record<LeaderboardGameId, LeaderboardViewConfig>` still refuses to compile until a Game that
  declares `leaderboard` gets a config row. The compiler asks the same question it did before — it
  just asks it about a Game that opted in, rather than about every Game ever registered.
- `leksiarxeio` declares `scores` even though it posts through `useLeksiarxeioScoreSubmission`
  (a row per word length) rather than the generic hook. "May write Scores" is the same capability
  either way; which hook does it is an implementation detail no type needs to police. This is a
  deliberate slight widening of what the generic hook accepts.
- `leksindeseis` is `wip:true` and keeps both capabilities. Its `wip` flag is a launch decision,
  not missing content (see the registry comment). **`wip` and capabilities are independent** — do
  not add a guard tying them together.
- `posokanei` and `logopaignio` lost their score hook, their `useLiveScorePost` call, their
  leaderboard modal, their result-panel leaderboard link, and their 🏆 triggers. Restore all of it,
  wired exactly as the `topothesies` board wires it, on the day the capabilities are granted.
- `GamePageChrome` gained `hasLeaderboard` (default `true`) and `ShareResultPanel`'s
  `onOpenLeaderboard` became optional, so a Game without a board renders no trigger rather than
  opening an empty modal.
- The placeholder rows already written to production `game_scores` are left in place —
  `game_scores` is append-forever, and with the config rows gone nothing reads them.

## Trap

`src/app/page.tsx` is a Server Component. Importing the **value** `LEADERBOARD_GAME_IDS` from
`GameLeaderboardModal` (a `"use client"` module) type-checks and builds, then fails at prerender
with `LEADERBOARD_GAME_IDS.includes is not a function` — a client-reference proxy arrives instead
of the array. Read capabilities from `@/config/games` (`gameIdsWith`) in server components. Types
imported from client modules are fine; they are erased.
