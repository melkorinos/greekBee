# Agent Reflections — Greek Word Games Platform

> **Rule (2026-08-17):** under **120 lines** — live, still-open tensions only, each a watch item with
> a pointer to its owner. Resolved tensions are **deleted**, not archived (git history is the
> archive); durable lessons go to an ADR with a pointer here. **Grep before you add.**

## 🔴 Measure the artifact, don't trust the narrator — **ADR 0026**

The repo's most expensive recurring failure — sixteen instances across s130–s164, plus the
visual/preview corollary — now lives in `docs/adr/0026-measure-the-artifact-not-the-narrator.md`.
Read it in any session touching a spec, an issue file, a tool claim or a rendered artifact. Short
form: **a plausible, load-bearing, cheap-to-check claim is the one believed instead of checked**, and
every narrator has been wrong: external APIs, type signatures, tools, named test files, the tracker's
own issue files, my own memory, my own probe, the operator. Closed to routine appends — add a row
only for a **new narrator class**.

## 🔴 Two sessions can share one working tree, and only git will tell you (s156, s159)

The session-start `git status` is a **photograph, not a feed**. s156 found `HEAD` moved twice and a
file modified by nobody in the session. Hazards: parallel tool calls race the other session's writes;
**`git stash` is not read-only** (use `git stash create`, or read the diff); a test can fail for a
reason true for seconds. Rule: **re-run `git log --oneline -3` and `git status` immediately before
staging, and stage explicit paths, never `-A`.** Still open — no lock, no branch-per-session
convention, and the Dream itself writes four shared files. s159 had two sessions grilling **the same
file**, relayed through the operator in prose because neither could see the other: folding four
issues into one file bought fewer places to look and cost the concurrency four files were quietly
providing. **When consolidating, ask what concurrency the split was buying.**

## 🟠 Gates whose entire enforcement is a human reading a line

Counted together, because each one alone looks acceptable:

- **The backup never leaves the machine.** `db:backup` makes an AES-256 `.7z`; the half that
  constitutes a backup is a human carrying it to Drive and **nothing checks that happened** — the
  runbook dumps at step 3 and runs the wipe it is the only undo for at step 4. Deliberately manual,
  so an accepted risk. s159 measured the predicted failure already live: **no archive existed at
  all**, three sessions after destination, encryption and cadence were each written up. **Work that
  ships as a script is not work that has run.** Setup order is in the memory.md Backup-order row;
  **current measured state is `ISSUE-01` §1 — read it, never a copy here.**
- **Three operator eye-checks are owed and none has happened:** Trophy Case + leaderboard chip in
  both themes (s144), Shell header at four buttons (jsdom has no layout — no test can cover it), and
  letter-box grid legibility (s162; `letterBoxBorder.test.ts` says so in its own header). Watch
  whether "flagged it in the reply" is becoming this repo's substitute for a gate.
- **The 180-day horizon test** in `dailyPuzzleSelection.test.ts` is the only thing between Λεξόκηπος
  and a silent year of replayed boards past the calendar's end. Corpus runs to 2028-03-26, warning
  fires ~Sept 2027, and any prune moves the warning closer without moving the date anyone has in mind.
- **`validateEmitted`** proves the Topothesies geo data is well-formed, not that it is right — two
  wrong peel rules shipped through it clean; what caught both was reading the generator's own
  diagnostic numbers (ADR 0018).

The inverse also happens: `ISSUE-05` blocked a `DROP COLUMN` behind a backup protecting rows
`launch-reset.sql` deletes one step earlier. **A gate must cite a consequence, never a rule.**

## 🟠 A skill file is a cache, and a stale cache speaks with authority (s150)

`project-mcp` had two entries wrong in opposite directions, both load-bearing: it denied `vercel logs`
flags that exist, and it presented MCP tools as primary while every project-scoped Vercel MCP call
403/404s (`list_teams` still succeeds, so it reads as "wrong id" — the exact thrash the skill exists
to prevent). **A skill is the only doc here read *instead of* checking**, and external tool behaviour
drifts without anyone touching this repo. **When a skill entry is about to decide something, spend
the one command to confirm it**, and **date the correction in the file**.

## 🟠 A DB test validates the migration and is blind to the deploy (s142)

The live-DB tests talk to Postgres directly — no deployed app code runs — so they go green the moment
a migration lands, whether the deploy succeeded, failed, or never started. A migration dropping a
table while production still writes to it means **a green suite actively reassuring the operator while
every write 500s**. Any migration window needs one check hitting the **deployed route**.

## 🟡 Authored content vs derived word lists — the s133 class of bug

Vres Tin Frasi shipped 29% of its corpus unsolvable: **authored content and derived fixed-length
pools have no structural link**, and nothing fails loudly — the puzzle renders and only the correct
answer is refused. `phraseCorpusPlayable.test.ts` closes it there by driving the **real validator over
the whole authored corpus**; a per-item unit test cannot. **Sweep still owed:** Leksindeseis puzzles,
Topothesies answer names, and the Leksoplegma/Leksodromia reuse of Leksiarxeio's pools all pair
hand-written content against generated data. Related: a derived file can be **regenerated empty** —
before "just add a list", ask whether a re-sync owns that directory.

## 🟡 Testing traps that cost a session each

- **A loose API stub does not fail the test, it empties the page (s140).** An unguarded `.map` on a
  missing stub field throws mid-render, React unmounts the tree, and the assertion reports an **empty
  body** — reading exactly like "the section was never added". Page-composition tests need **real
  response shapes**; an empty container means **read the exception trace before the assertion**.
- **A retired id is still sitting in your fixtures (s140).** Retiring two achievement ids broke 8 test
  files, mostly where ids were *arbitrary valid strings*; grep is the only map and each hit needs
  judgement, never a `sed`. **When a fixture stops compiling against reality, ask whether the test
  still describes a possible world.**
- **`coverageMap.md` covers 174 of 202 files (s163), and three entries once described tests that do
  not exist (s157)**, claimed as covered for seven months. A gap makes you write a test you may
  already have; a wrong entry makes you trust one that was never there. Re-count rather than trust
  this line, and when the Dream updates the file, re-read the rows it touches — don't only append.

## 🟡 Smaller live watches

- **The Maker page has no rendering test (s152)** — its editing rules are pure and 44 tests deep, but
  a dropped `useEffect` listener would pass every one of them. One Playwright spec closes it.
- **Deferring a threshold on a live-capture counter destroys data (s139).** "Lower is safe, raise is
  impossible" is about **earned** rows, not **unwritten** ones — any counter added ahead of the badge
  reading it owes: **what is not being recorded in the gap?**
- **Zero rows is the reason to look, not reassurance (s134).** `consumeApprovedPuzzle`'s two bugs were
  invisible because every queue held zero approved rows. Stavrolekso's `pending` row is one approval
  away, and the admin approves blind — a wrong schedule is fixable only by SQL.
- **Sound Cue files: record each file's actual licence**, never the site's (Freesound hosts CC0,
  CC-BY and CC-BY-NC side by side).
- **ADR 0010's premise is dead and Offline Mode is PARKED.** `e2e/offlineMode.spec.ts` is
  skipped-and-failing on purpose as the acceptance test. Watch **dormant code rotting** — nothing
  exercises the offline branches now. Don't patch around it; see the memory.md row.
- **Graduating a Game is a checklist, not a flag flip** — `wip` and `hidden` (orthogonal, ADR 0022),
  accent row, capability grant, content, docs. **Read the registry, never prose, for status.**
- **Word-length badges are exact length** (operator's choice), so 12/13 may almost never earn and
  «Λέξεις ανά μήκος» reads near-empty. Lever: `achievementTuning.wordLengthBadges`.
- **Λογοπαίγνιο's bottleneck is curation, not sourcing** — 144 assets staged, **0 approved**, many
  still carrying the wordmark; do not bank 144 as progress toward 150. Ship-anyway on trademarks is
  the decided risk, and the note must land in CONTEXT/ADR at the wip→live flip. **Πόσο κάνει; needs
  real content and nothing tracks it** — file a ticket first; flip `wip:false` only after content.
- **Two accepted UX gaps, unfiled:** Leksindeseis never shows *which* group is one away, and
  `/leksokipos/[center]/[outer]` warns below 5 valid words but has no 404 floor.
