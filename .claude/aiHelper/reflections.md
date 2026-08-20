# Agent Reflections — Greek Word Games Platform

> **Rule (2026-08-17):** under **120 lines** — live, still-open tensions only, each a watch item with
> a pointer to its owner. Resolved tensions are **deleted**, not archived (git history is the
> archive); durable lessons go to an ADR with a pointer here. **Grep before you add.**

## 🔴 Measure the artifact, don't trust the narrator — **ADR 0026**

The repo's most expensive recurring failure — sixteen instances across s130–s164, plus the
visual/preview corollary — lives in `docs/adr/0026-measure-the-artifact-not-the-narrator.md`. Read it
in any session touching a spec, an issue file, a tool claim or a rendered artifact. Short form: **a
plausible, load-bearing, cheap-to-check claim is the one believed instead of checked**, and every
narrator has been wrong — APIs, type signatures, tools, test files, the tracker, my own probe, the
operator. Closed to routine appends: add a row only for a **new narrator class**.

## 🔴 Two sessions can share one working tree, and only git will tell you (s156, s159, s170)

The session-start `git status` is a **photograph, not a feed**. s156 found `HEAD` moved twice and a
file modified by nobody in the session. Hazards: parallel tool calls race the other session's writes;
**`git stash` is not read-only** (use `git stash create`, or read the diff); a test can fail for a
reason true for seconds. Rule: **re-run `git log --oneline -3` and `git status` immediately before
staging, and stage explicit paths, never `-A`.** Still open — no lock, no branch-per-session
convention, and the Dream itself writes four shared files. s159: two sessions grilled the same file,
relayed through the operator because neither could see the other — **when consolidating, ask what
concurrency the split was buying.** s170 lost it the other way: a staged `git rm` and three edited
docs were swept into **another session's commit**, under a message about something else. The
mechanism is not `-A`: that session staged explicit paths and then ran a bare `git commit`, which
commits **the whole index, including entries the other session staged**. So: `git commit -- <paths>`,
or read `git status` for foreign staged entries first. **Commit the moment a change is coherent;
never stage and keep working.**

## 🟠 Gates whose entire enforcement is a human reading a line

- **Nothing schedules the backup, and nothing checks the upload.** Carrying the `.7z` to Drive is a
  human act **nothing verifies**, and the runbook dumps at step 3 then runs at step 4 the wipe it is
  the only undo for. **A script that ships is not a script that has run** — s159 found no archive at
  all, three sessions after cadence was written up; s166 ran it, s170 got one into Drive. Still
  unbought: the weekly task is **unregistered**, and nothing has opened the archive off this
  machine. **Measured state is `ISSUE-01` §1 — never a copy here.**
- **Four operator checks on a real device are owed and none has happened:** Trophy Case + leaderboard
  chip in both themes (s144), Shell header at four buttons (jsdom has no layout), letter-box grid
  legibility (s162), and **the native share sheet** (s169 — a mock of `navigator.share` is a claim
  about someone else's contract, so pressing Κοινοποίηση on a phone is the only proof). Watch whether
  "flagged it in the reply" is becoming this repo's substitute for a gate.
- **The 180-day horizon test** in `dailyPuzzleSelection.test.ts` is the only thing between Λεξόκηπος
  and a silent year of replayed boards past the calendar's end. Corpus runs to 2028-03-26, warning
  fires ~Sept 2027, and any prune moves the warning closer without moving the date anyone has in mind.
- **`validateEmitted`** proves the Topothesies geo data is well-formed, not that it is right — two
  wrong peel rules shipped through it clean; what caught both was reading the generator's own
  diagnostic numbers (ADR 0018).

The inverse also happens, twice on the same gate: `ISSUE-05` blocked a `DROP COLUMN` behind a backup
protecting rows `launch-reset.sql` deletes one step earlier; then the freeze on
`supabase/migrations/` outlived what it bought — one moment of DDL against an empty `game_scores` —
because s172 dropped a dead column early anyway, **spending** the guarantee rather than deferring it
(ADR 0027 §5). **A gate must cite a consequence, never a rule** — and when the consequence is spent,
say so out loud, because a rule with no live reason still reads as binding to a cold session.

## 🟠 A skill file is a cache, and a stale cache speaks with authority (s150)

`project-mcp` had two entries wrong in opposite directions, both load-bearing: it denied `vercel logs`
flags that exist, and it called project-scoped Vercel MCP primary while every such call 403/404s
(`list_teams` still succeeds, so it reads as "wrong id"). **A skill is the only doc here read
*instead of* checking**, and external tool behaviour drifts without anyone touching this repo. When a
skill entry is about to decide something, **spend the one command**, and **date the correction**.

## 🟠 A DB test validates the migration and is blind to the deploy (s142)

The live-DB tests talk to Postgres directly — no deployed app code runs — so they go green the moment
a migration lands, whether the deploy succeeded, failed or never started: **a green suite actively
reassuring the operator while every write 500s**. Any migration window needs one check hitting the
**deployed route** (release day does this at runbook step 2).

## 🟡 Authored content vs derived word lists — the s133 class of bug

Vres Tin Frasi shipped 29% of its corpus unsolvable: **authored content and derived fixed-length
pools have no structural link**, and nothing fails loudly — the puzzle renders and only the correct
answer is refused. `phraseCorpusPlayable.test.ts` closes it by driving the **real validator over the
whole authored corpus**; a per-item unit test cannot. **Sweep still owed:** Leksindeseis puzzles,
Topothesies answer names, Leksoplegma/Leksodromia's reuse of Leksiarxeio's pools. And a derived file
can be **regenerated empty** — before "just add a list", ask whether a re-sync owns that directory.

## 🟡 Testing traps that cost a session each

- **A loose API stub does not fail the test, it empties the page (s140).** An unguarded `.map` on a
  missing stub field throws mid-render, React unmounts the tree, and the assertion reports an **empty
  body** — reading exactly like "the section was never added". Page-composition tests need **real
  response shapes**; an empty container means **read the exception trace before the assertion**.
- **A retired id is still sitting in your fixtures (s140).** Retiring two achievement ids broke 8 test
  files, mostly where ids were *arbitrary valid strings*; grep is the only map and each hit needs
  judgement, never a `sed`. **When a fixture stops compiling against reality, ask whether the test
  still describes a possible world.**
- **`coverageMap.md` misses files, and three entries once described tests that do not exist (s157)**
  — claimed as covered for seven months. A gap makes you rewrite a test you have; a wrong entry makes
  you trust one that never existed. **Re-read the rows the Dream touches**, and count against disk.

## 🟡 Smaller live watches

- **Five routes have no browser test at all (s152, widened s171)** — all three Stavrolekso routes plus
  Topothesies and Leksikastirio. Pure logic is tests-deep; a dropped listener passes it all. `ISSUE-03`.
- **Deferring a threshold on a live-capture counter destroys data (s139).** "Lower is safe, raise is
  impossible" is about **earned** rows, not **unwritten** ones — ask what the gap is not recording.
- **Zero rows is the reason to look, not reassurance (s134).** `consumeApprovedPuzzle`'s two bugs were
  invisible because every queue held zero approved rows. Stavrolekso's `pending` row is one approval
  away and the admin approves blind — a wrong schedule is fixable only by SQL.
- **ADR 0010's premise is dead and Offline Mode is PARKED.** `e2e/offlineMode.spec.ts` is
  skipped-and-failing on purpose as its acceptance test. Watch **dormant code rotting**; see memory.
- **Graduating a Game is a checklist, not a flag flip** — `wip` and `hidden` (orthogonal, ADR 0022),
  accent row, capability grant, content, docs. **Read the registry, never prose, for status.**
- **Word-length badges are exact length** (operator's choice), so 12/13 may almost never earn and
  «Λέξεις ανά μήκος» reads near-empty. Lever: `achievementTuning.wordLengthBadges`.
- **Λογοπαίγνιο's bottleneck is curation, not sourcing** — 144 assets staged, **0 approved**, many
  still wearing the wordmark; do not bank 144 as progress toward 150. Ship-anyway on trademarks is
  the decided risk, noted in CONTEXT/ADR at the wip→live flip. **Πόσο κάνει; needs real content and
  nothing tracks it** — ticket first, flip `wip:false` only after.
- **Two accepted UX gaps, unfiled:** Leksindeseis never shows *which* group is one away; `/leksokipos/[center]/[outer]` warns below 5 valid words but has no 404 floor.
- **One behaviour, two seams — the ticket names one (s169).** ADR 0025 rejected the auto-opening
  leaderboard; two Games did it with their own `setTimeout`, three more through
  `useLiveScorePost`'s `onFinish`, so fixing the two the ticket listed left half the Platform still
  doing it, and only playing found that. **Grep for the behaviour, not the files the scope names.**
