# An intermittent `game_state` DELETE failure in `rlsInvariantsLiveDb` under full-suite load

**Deferred:** 2026-08-14
**Revisit when:** it fires again and blocks a gate, or the live-DB suites are next touched for any
other reason. Do **not** open a session to hunt it — see "Why deferred".

## Problem

`src/test/shared/rlsInvariantsLiveDb.test.ts` talks to the real Supabase project. Session 140 saw a
`game_state` DELETE assertion fail **once**, only in the full suite and not in isolation, and read it
as contention under load rather than a real RLS regression. It was filed at the time as `ISSUE-02`.

**The `ISSUE-02` file was never written to disk.** For roughly four sessions `memory.md`, `goals.md`
and `.claude/handoffs/launch-readiness.md` all cited a tracker file that did not exist, each saying
"resolve or re-file". This issue is that re-file; the number `02` stays spent per the standing rule.

Two things are worth separating, because they were repeatedly conflated:

- **The five `player_milestones` failures** that s142 documented were a *different* problem — the
  un-pushed `20260807120000` migration. s144 confirmed those gone and the suite at 30/30. Resolving
  them said nothing about this flake.
- **This flake** is a sixth, intermittent failure on a `game_state` DELETE.

## Evidence, such as it is

| When | Full-suite result |
|---|---|
| s140 | one `game_state` DELETE failure, not reproducible in isolation |
| s144 | `rlsInvariantsLiveDb` 30/30 |
| 2026-08-14 | whole suite green — **196 files / 2499 tests, 0 failures** |

So it has not been seen in two full-suite runs since. That is evidence, not proof: an intermittent
failure is not disproved by green runs, which is exactly why this is filed rather than deleted.

## Why deferred

Nothing to fix yet. The failure has no reproduction, no hypothesis beyond "contention", and no cost
while the suite is green. Hunting an intermittent live-DB flake that has not fired in two runs is a
poor use of a session, and the launch gate (`CLAUDE.md`) is the suite green on the merge commit —
which it is.

The one thing that would change this: it firing again. At that point the first question is whether
the DELETE is racing another test's write against the **single shared dev/prod project**
(`shared dev/prod database` — one Supabase project backs both), not whether an RLS policy regressed.

## References

- `src/test/shared/rlsInvariantsLiveDb.test.ts` — the suite.
- `.claude/aiHelper/log.md`, session 140 — where it was first seen and mis-filed.
- `.claude/aiHelper/reflections.md`, "The deploy window's acceptance test only proves half of it" —
  why the live-DB suites are blind to whether a deploy happened, and why their green is narrow.
