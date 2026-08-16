# Agent Reflections — Greek Word Games Platform

## ⚠️ Active Tensions (watch these)

### 🔴 Two sessions can share one working tree, and git is the only thing that will tell you (s156)

**A second agent session was editing this repo while s156 ran, and nothing in the harness announced
it.** What announced it was `git log` disagreeing with the session-start snapshot: `HEAD` had moved
twice, `ISSUE-05` had been split into a new `ISSUE-09`, and `game-state/route.ts` was modified by
nobody in this session. The session-start `git status` is a **photograph, not a feed** — every later
decision made from it is made from a stale picture.

Three hazards, all hit or narrowly missed. **Parallel tool calls race the other session's writes** —
an `ls` and a `git stash` in one block returned a listing that existed at no single moment, reading
as a missing file rather than a race. **`git stash` is not read-only** — it was used to answer "did
this fail before my changes?", a fair question with a destructive instrument; it reverted the other
session's uncommitted work, and `stash pop` restoring cleanly was luck. Use `git stash create`, which
writes no working tree, or read the diff. **A test can fail for a reason that is true for seconds** —
`trackerReferences.test.ts` failed on an `ISSUE-09` reference written before its file existed, and
re-running is only the right check once you know *why*, or a real failure gets re-run until it passes
for an unrelated reason.

The practical rule: **re-run `git log --oneline -3` and `git status` immediately before staging**, and
stage explicit paths, never `-A`. s156's commit deliberately swept in one file it did not author
(`trackerReferences.test.ts`, which held its own `SPENT` entry) and said so in the message; the
dishonest version quietly carries another session's half-finished work. **Still open:** nothing
prevents a recurrence — no lock, no branch-per-session convention, and the Dream itself writes four
shared files, exactly where two sessions finishing near each other collide hardest.

**s159 — the consolidation made this structurally worse, and the collision was not in git.** Two
sessions grilled **the same file** simultaneously: this one on `ISSUE-01` §1–2, another on §3, with
the second session's results **relayed by the operator in prose** because neither could see the
other. The file I read at session start had already been replaced on disk — `ISSUE-06` no longer
existed as a file, having become §2 — and I only learned that when the operator pasted it back.
Folding four issues into one file was done to have fewer places to look; the cost that surfaced first
was that **two agents now serialise through a human on a single file** where four files would have
let them work independently. **A per-file grill is safe only while one file means one topic.** When
consolidating, ask what concurrency the split was quietly buying.

### 🟠 The backup is now encrypted, and still nothing makes it leave the machine (s154)

`TICKET-11` automated the half a script can do — the dump is packed into an AES-256 `.7z`, the
password is mandatory, there is no unencrypted fallback. The half that actually constitutes a backup
is a human carrying that file to Drive, and **nothing checks it happened.** The runbook's step 3 and
step 4 sit next to each other: take the dump, then run the wipe that the dump is the only undo for.
An archive still sitting in `db-backups/` when `launch-reset.sql` runs is indistinguishable, from
inside the process, from a completed backup.

The uploading was deliberately left manual — automating it means a Google credential in `.env.local`
for a step performed a handful of times a year — so this is an accepted risk, not an oversight. But
it is the same shape as the Sound Cues deploy gate and the s153 horizon test: **a correct decision
whose entire enforcement is a human reading a line at the right moment.** Three of those now.

Watch: any release-day run where step 3 and step 4 happen close together, and the moment the archive
becomes scheduled rather than occasional — a weekly cadence nobody uploads is worse than no cadence,
because it produces a folder full of evidence that backups are being taken.

**s157 — the mirror image: a backup gate that was protecting nothing.** `ISSUE-05` blocked a
`DROP COLUMN` on `game_scores` behind `TICKET-11`, on the correct-sounding rule that DDL against the
append-forever substrate must wait for a restorable dump. Reading `launch-reset.sql` dissolved it:
**step 4 deletes every row of that table**, so the data the dump would protect is condemned one step
earlier. The block had been written by applying the rule rather than by checking what the rule was
buying — and the issue file half-knew, carrying a paragraph headed *"be honest about what the block
is buying"* that stopped short of the conclusion. The fix was not to weaken the gate but to **move
the work to where the risk is genuinely zero** (step 5, after the wipe), which is strictly safer than
the "do it now, the risk is small" reading the file was drifting toward. Watch for the same shape
wherever a gate cites a rule instead of a consequence: the question is never "does the rule apply"
but "what does obeying it protect, here."

**s159 — the predicted failure was already live, and worse than predicted.** This entry warned that
"a weekly cadence nobody uploads is worse than no cadence." Measured: `BACKUP_ARCHIVE_PASSWORD` is
absent from `.env.local`, so `npm run db:backup` **throws before dumping anything**; `db-backups/`
holds two unencrypted folders whose newest is 2026-08-08, predating `TICKET-11` entirely; and the
weekly task is unregistered. So there is **no encrypted archive in existence** — three sessions have
now written about the backup's destination, encryption and cadence while the thing itself has never
run once in its finished form. The operator had approved registering the scheduler that same session,
which would have produced exactly the folder-of-evidence failure named above, except emptier: a job
throwing at line 107 every Sunday at 02:00 with nobody watching stderr. **Order corrected to password
→ manual dump → verify extraction on another machine → schedule.** The general shape: **work that
ships as a script is not work that has run**, and a `TICKET`'s "agent half shipped" says nothing about
whether the artifact it produces exists. Watch for any other capability whose only evidence of
working is that its code was reviewed.

### 🟡 Λεξόκηπος now degrades quietly where it used to degrade loudly (s153)

The old miss rule froze the game on one board past 2028-03-26 — catastrophic, but *visible* the day
anyone looked. The rotation that replaced it is strictly better and also strictly quieter: past the
calendar's end, players simply replay old boards and nothing about the page says so. The only thing
standing between that and an unnoticed year of reruns is the **180-day horizon test** in
`dailyPuzzleSelection.test.ts`, which is a red suite and nothing else — no banner, no log line, no
operator-facing signal.

That is the right trade for now (the corpus reaches 2028, the warning fires ~Sept 2027) but it rests
on the suite still being run and read at that point, by whoever is here then. The same shape as the
Sound Cues deploy gate: a correct decision whose enforcement is one test's failure message.

Watch: the horizon test going red, and any prune that shortens the corpus — a prune moves the warning
closer without moving the date anyone has in mind. Note the memory's "799 puzzles" figure was already
stale (**733**), which is exactly how a horizon quietly shrinks.

### 🟠 A test harness that cannot express the product's own alphabet (s152)

Playwright fires **no keydown events at all** for Greek characters — `keyboard.type("ΑΒΓ")` produces
nothing, while Latin letters in the same call arrive normally. On a platform whose every game is
played in Greek, that is a hole in the one tool used to prove a page works, and its failure mode is
the worst kind: the feature under test looks broken, so the reflex is to go debug working code. An
hour went that way before a `window` listener settled it.

The tension is not the workaround, which is easy (type Latin where both alphabets are accepted, or
dispatch the events by hand). It is that **the e2e suite is structurally unable to exercise the
product's real input path**, and every future "the maker works" or "the keyboard works" claim rests
on that substitution being harmless. It is harmless *here* only because `isLetterKey` accepts both
alphabets by design — a game that accepted Greek alone could not be e2e-tested at all with this tool.
Related: this is the second consecutive session where a **tool's assumed capability**, not the code,
was the thing that was false (s150's Vercel MCP was the first).

Watch: any new e2e that types letters, and any change narrowing accepted input to Greek only.

### 🟡 The Maker is the last page whose rendering nothing checks (s152)

The editing rules are now pure and covered 44 tests deep, and the page dropped to 515 lines — but the
**wiring between them is still unobserved.** Nothing renders `/stavrolekso/maker` in the suite. The
throwaway browser smoke written this session found nothing wrong, and was deleted with the agreed
seams; two of its three failures were the *test* being wrong about behaviour that was correct, which
is itself the argument for keeping one — those wrong assumptions would otherwise have been mine to
carry into the next change.

Two specific things sit uncovered: that a keystroke reaches the reducer at all (a dropped `useEffect`
listener would pass every unit test), and that the clue input keeps its own keystrokes. Both are one
Playwright spec. Related to `ISSUE-03` but not the same thing — that issue is about depth across
launched games; this is a page with a genuine editor on it and zero coverage of any kind.

Watch: the next change to the maker page, and whether `ISSUE-03` gets picked up in a way that could
absorb this.

### 🟠 An artifact built for the operator is only delivered if it renders on the operator's device (s151)

s143 established the method that has been used for every visual decision since: put the options in
`.claude/aiHelper/html/` and let the operator look. s151 found that **half those artifacts could not
be read on the device the operator actually uses.** The badge grill and the first share-card page
built themselves in JavaScript, and iOS previews HTML attachments through Quick Look, which draws
HTML and CSS but **runs no scripts** — so those pages were blank on an iPhone while working perfectly
on Android, which hands the same file to Chrome. Two of them had no `viewport` tag either, so iOS
laid them out at 980px and shrank them.

The tension is not the CSS, which is now fixed and recorded in `memory.md`. It is that **the method
was judged by whether the file was produced, never by whether it was legible where it landed** —
across roughly eight sessions of "the operator will look at this", nobody checked. The general shape:
*an output whose whole purpose is a human decision has an acceptance test, and it is that the human
can read it.* The same trap is waiting anywhere else an artifact is handed off rather than run —
scripts assuming a shell the operator does not use, or copy assuming a screen width.

Watch: anything new under `html/`, and the three generators in `scripts/` that emit such pages. The
rule is written down now, but the rule was never the missing part — the check was.

### 🟠 A skill file is a cache, and a stale cache speaks with authority (s150)

`project-mcp` exists so sessions stop re-deriving infrastructure facts. It worked — and **two of its
entries were wrong in opposite directions**, both load-bearing for `TICKET-08`:

- It said `npx vercel logs` **"live-streams runtime logs from now (no lookback)"**. It does not:
  streaming is opt-in via `--follow`, and the default is a *historical* query with `--since`,
  `--until`, `--level`, `--status-code`. The entire manual check this session had to write is
  only writable because of flags the skill said did not exist. Had I trusted it, the honest
  conclusion would have been "no queryable history exists, so the check must be a dashboard habit" —
  a worse artifact, reached by obedience.
- Conversely it presents the MCP tools as the primary path, and **every project-scoped Vercel MCP
  call is now 403/404** while `list_teams` still succeeds. That combination is the nasty one: the
  connector looks alive, so the natural reading is "I passed the wrong id", which is exactly the
  thrash the skill exists to prevent.

The tension is structural, not a one-off correction. **A skill is the only doc in this repo that is
read *instead of* checking**, which is its value and its whole risk. `CLAUDE.md` already says the
tracker's folder is its state and that git is the archive; skills have no such freshness mechanism,
and the entries most worth caching (external tool behaviour) are precisely the ones that drift
without anyone touching this repo. The file's own "When this is wrong" footer is the right instinct
and it depends entirely on someone noticing.

Practical form, and it is cheap: **when a skill entry is about to decide something, spend the one
command to confirm it** — `--help` for a CLI claim, one call for a tool-reachability claim. The
skill's job is to tell you *what to check and with which id*, not to excuse the check. Two entries
were corrected this session and the corrections are dated in the file; date the next ones too, so a
future session can see which claims have been touched since anyone last looked.

### 🔴 Measure the artifact, don't trust the response — the standing rule and its ledger

**This repo's most expensive recurring failure, in fourteen recorded instances across s130–s159.**
The shape is always the same: a claim that is **plausible, load-bearing, and cheap to check** is
believed instead of checked. What varies is only *who is narrating* — and the point of keeping the
ledger rather than nine separate entries is that the list of narrators is now long enough to stop
treating any of them as reliable.

| Session | The narrator | What it claimed | What was true | The check |
|---|---|---|---|---|
| s130 | An external API | Commons search returns the entity you searched for | ΔΕΗ → *Namibia Power*, ΣΤΑΣΥ → *a Lithuanian choir*; declared image sizes lie; an HTML error page saved as `.svg` | measure the bytes |
| s130 | **My own tool** | the duplicate detector's 48 duplicates | 43 of them grouped under `undefined` | read its output |
| s132 | A type signature | `router.prefetch` returns a Promise | returns **`void`** — the awaited `undefined` shipped, and **the unit test mocked it as promise-returning, so it could only ever confirm my assumption** | one grep of the `.d.ts` |
| s139 | **The repo's own spec** | "the word capture is dark behind `FEATURE_FLAGS.achievements`" | that flag had been `true` since s112; the capture was live | one grep of the config |
| s145 | **Every secondary source** | Pixabay is CC0 | it is the *Pixabay Content License* — still clears our bar, but "CC0" would have been written into `sound.ts` as a fact | one fetch of the licence page |
| s146 | A spec's **trap list** | "jsdom does not implement `HTMLMediaElement.play`, guard the stub like `scrollIntoView`" | jsdom **defines** `play()` and returns **`undefined`** — the copied guard never fires and `.catch()` is a TypeError. *Second* void-dressed-as-Promise. | a ten-second probe test |
| s146 | A **named test file** | `mobileLayout.test.tsx` guards the header at four buttons | it renders `HowToPlayModal` and has never touched the Shell — and **no test here could**, jsdom has no layout engine | one `Read` |
| s148 | A ticket's **file list** | "update `e2e/games.spec.ts` for the new picker" | that spec has no picker assertions at all; the test that actually broke appeared in no list | grep |
| s150 | **A tool** | `get_runtime_errors`/`get_runtime_logs` are reachable via MCP | both 403, `get_project` 404s on every id form | **call the tool** |
| s155 | **My own persisted memory** | "the 10-day `game_scores` prune is a bug, tracked as issue 03" | the prune was fixed long ago (`retention.ts` exempts scores explicitly) **and** `ISSUE-03` is now an unrelated file about e2e coverage — *both halves stale* | one `Read` of `retention.ts`, one `ls` of `issues/` |
| s158 | **An issue file, and then me repeating it** | ISSUE-09: `data.words` is "the only record of a round's total word count", the one argument against removing the write | `flushOutbox` posts **without** `data` (`offlineOutbox.ts:115-121`), so every Score queued in Offline Mode already landed `{}` — a lossy record, not the only one. The operator supplied it; I had restated the claim as fact | **read the other writer** |
| s156 | **The repo's own issue file** | ISSUE-08: adding `display_name` to the badge `in()` "makes the stored copy redundant" | **19 of 52 scoring devices have no `player_profiles` row at all** — a device only gets one once it sets a name or picks a badge, so dropping the copy would have blanked a third of the leaderboard | one `SELECT count(*)` |
| s159 | **An issue file** | ISSUE-01 §2's verification "needs a scratch database the shared project does not give us" — a blocker inherited unexamined through two rewrites and a consolidation | a scan-vs-index crossover is **Postgres behaviour, not Supabase behaviour**, and PostgreSQL 18 was already installed on the machine for `pg_dump`. Nothing was ever blocked | `command -v psql` |
| s159 | **Me, past output I had already generated** | "ISSUE-09's content was lost in the fold — the ledger points at a §4 that does not exist" | it was **fixed** in `2f4cf77`, and that commit was **visible in the `git log --oneline` I had run one call earlier**. The ledger row was mislabelled, not orphaned | **read the output you already have** |
| s160 | **My own probe** | `pg_isready` returned *accepting connections*, so I told the operator the index measurement could be run now | listening is not authenticated: every `pg_hba.conf` line is `scram-sha-256` and the only password to hand was Supabase's. **The check I ran was adjacent to the claim I made** — the first ledger row where the measurement was real and simply answered a different question | open the connection, don't ping the port |

Four things the ledger makes visible that no single entry did:

- **A mock is a claim about someone else's contract.** If the claim is wrong the test is worse than
  absent, because it manufactures confidence (s132, s140). **Any feature whose value depends on
  browser or runtime behaviour needs one real-browser test before it is called done.**
- **A citation to a named artifact in this repo reads as verified and almost never is** (s146 twice,
  s148). A ticket's file list is a hypothesis; grep is the map.
- **A spec's stated reason can be false while its decision is right** (s139, s150, s156, s161) — which is
  the dangerous version, because the decision surviving review is taken as the reason surviving it.
  s156 is the sharpest form yet: ISSUE-08's *decision* (resolve names at read time) was correct and
  shipped unchanged, while the sentence justifying it — that the stored column becomes redundant —
  was false, and implementing the issue as written would have caused a worse bug than the one it
  fixed. **An issue file is a hypothesis with a number on it, not a design review that already
  happened.** The check that saved it took one query and was prompted only by asking "what does this
  read return for a row that has no match?" — the question every read-time resolution owes.
  **s161 is the same shape arriving from the operator, and it is the cheapest version to get wrong.**
  A bug report said a purple tile should be grey *because the third word has no Α*; the verdict was
  right and the reason was its exact inverse — the third word is ΔΙΔΑΣΚΩ, it *does* hold an Α, and
  that Α is why the purple rendered at all. Agreeing would have produced a "fix" aimed at suppressing
  cross-word purple rather than at claim ordering, and it would have looked confirmed by the very
  screenshot that prompted it. **Reproduce the reported symptom before adopting the reporter's model
  of it** — recovering the real answer phrase from the corpus cost one query and turned a plausible
  story into a tile-for-tile repro. A correct conclusion is not evidence of a correct diagnosis.
- **"The only record of X" is a claim about every writer, not the one in front of you** (s158). A
  field's completeness is decided by the *quietest* path that writes the row — here an offline flush
  that omits it — and that path is never the one the issue cites. **Before calling data
  irreplaceable, list every writer.** Note also which way the error ran: the file's claim made
  removal look costlier than it was, so an unchecked fact can defend the status quo just as easily
  as it can license a change.
- **A stale artifact can be wrong in both halves at once** (s155). The memory named a defect *and*
  the tracker file supposedly holding it; the defect was fixed and the number had been reused for
  something else. A citation that carries its own reference number reads as *more* verified than a
  bare claim, and the number is exactly the part that rots — tracker numbers are never reused, but
  they are freely reassigned to new files after a deletion. **Check the file, not the number.**
- **Escalating cost of the check.** Seven instances were one `Read` or one `grep`. s150 was not:
  a tool-reachability claim can only be checked by *calling the tool*, and nothing about reading a
  ticket prompts that. **A spec that names a tool as its mechanism should have that tool invoked
  before the spec is believed.**
- **A blocker outlives the rewrites that pass over it** (s159). "Blocked on the dev/prod split"
  survived two rewrites of `ISSUE-01` and a four-way consolidation, and each pass edited the prose
  around it while treating the dependency as settled. It was one `command -v psql` from false the
  whole time. **A `Blocked by:` line is the highest-value claim in any tracker file and the least
  often checked** — it is what stops work from starting, so nobody reaches the point of testing it.
  Re-derive the blocker before accepting that something is blocked; deferral compounds silently in a
  way a wrong implementation detail does not.
- **The cheapest check is the output you already have.** s159's second entry is the only one in this
  ledger where the check had *already been run*: `git log --oneline -5` printed the fix commit one
  call before I wrote that its content was lost. Every other row is a check not performed; this one
  is a result not read. **Running the command and reading the command are different acts**, and a
  conclusion formed before the scroll-back is re-read is not evidence-based just because evidence
  was fetched.

**Two narrators are ours and deserve their own line.** First, **our own hedging adjectives**: the
Leksindeseis fallback pool was called "thin" for weeks across three docs, in the tone of something
surveyed — it is **one puzzle** rotating over a single-item array, so every unscheduled day serves
the identical board (one `require()` settled it). The same session, "the legal surface" and "error
monitoring" turned out to mean *nothing exists at all*. "Thin", "minimal", "sparse", "a few" read as
the output of a count and almost never are; they are worse than a wrong number, because a wrong
number invites checking and a vague word invites agreement. **Replace the word with the number
before deciding**, and when writing one, either put the number in or say it was never counted.

Second, **a hazard we named ourselves and then stopped querying**. `TICKET-07` warned that installing
error monitoring *later* would falsify `/privacy`'s "no third-party tracking" line — sound,
well-argued, and aimed at the wrong time: `FeedbackModal.tsx` had been posting the URL and user agent
to `formsubmit.co` since it was built. The line was already false, and both the ticket and the launch
handoff had encoded the phantom dependency as a sequencing constraint, which is how a missed fact
becomes scheduling. **When a ticket warns that some future change would make a claim false, first
check whether the claim is true today** — the correcting question is not "which order?" but "is it
already happening?" *(Second-order, because it changed the design: the honest fix was not a longer
disclosure but dropping two of the four fields. A privacy page is the one document where shrinking
the truth beats describing it well.)*

**Live consequences still open.** For the Sound Cue files: record each file's **actual** licence, not
the licence of the site it came from — Freesound hosts CC0, CC-BY and CC-BY-NC side by side and its
most famous rooster is CC-BY. For the Shell header at four buttons: no test can cover it, so the
guard is an operator on a phone. For the Leksindeseis pool: **parked, not fixed** — the Game is
`hidden` (ADR 0022), so nothing ships until unhiding is considered, and unhiding is a checklist.

### 🟡 A component with no visual gate is verified by compiling it, not by rendering it (s144)

Every emoji badge became a drawn `BadgeMark` and all four gates went green — but **nothing in this repo
can tell a correct badge from a plausible one.** The unit tests assert `data-tier` attributes and path
strings; jsdom has no layout, no CSS, and no idea whether a 14px ring is visible or a locked tile reads as
locked. The one thing that could have failed silently and *did* get checked was a Tailwind class that never
compiles: `bg-tier-chryso-soft`, `--badge-size` and the `max(1px,calc(…))` ring width were grepped **out of
the production CSS bundle**, because a missing token renders a badge with no ring at all and every test
still passes. That check is the local instance of the standing rule — *measure the artifact, don't trust
the response* — applied to CSS rather than to an API.

What is still owed, and is not a gate: an operator eye-check of the Trophy Case and the leaderboard chip in
**both themes**. s143 established the standing method for exactly this (`.claude/aiHelper/html/` renders the
decision and the human looks), and the spec page there is what shipped — but a spec page is not the app.

The generalisable half: **for anything whose failure mode is "looks wrong", the test suite's job is to lock
the decisions, not to prove the result.** Two decisions are locked that way here — a tier changes only the
frame (same path `d` across two tiers) and a locked badge keeps its mark visible. Both would otherwise
survive only as prose in an ADR, which is precisely the thing s139 showed rots.

### 🟠 A DB test validates the migration and is blind to the deploy (s142, generalised)

Recorded as a standing rule for the **next** migration window, since the `player_milestones` one is
closed (suite green, migration confirmed pushed). The plan for such a window is: `db push`, then the
Vercel deploy, then re-run the live-DB tests. **Those tests validate step 1 only.** They open a
Supabase client and talk to Postgres directly — no deployed app code is exercised — so they go green
the moment the migration lands, whether the deploy succeeded, failed, or was never started.

The failure mode lives precisely in that gap: a migration that drops a table while production still
serves code writing to it means **a green suite actively reassuring the operator while every write
500s**. A window needs one check that hits the **deployed route**. Related: never read a commit count
out of a doc — re-measure with `git rev-list --count` before starting.

### 🟡 A discharged handoff is a second source of truth until it is deleted (s143)
`badgeIdeas.md` was fully discharged on 2026-08-07 — every build item shipped, every decision landed in ADR 0012/0013, `goals.md` and `launch-readiness.md` — and then **sat in `handoffs/` for three days**, because s140's Dream promoted its lessons but never removed the file. In the same window its sibling `badgeVisualSystem.md` went **stale on three facts** (a threshold, a tier ladder, and a citation to a superseded ADR amendment) with nothing flagging it, because a handoff has no mechanism that notices the world moved.

The operator caught both by asking. That is the tension: **the Dream reliably promotes content and unreliably deletes files.** `tracker/` has the rule (done means delete, git is the archive); `handoffs/` has the same need and no rule. Worth a habit at Dream time — for every handoff still on disk, name the thread that is still open, and if none is, delete it. A handoff whose decisions have all landed elsewhere is not documentation, it is a stale copy that a cold session will read as current.

### 🟡 Authored content vs derived word lists (the s133 class of bug)
Vres Tin Frasi shipped with 29% of its phrase corpus unsolvable — the game rejected its own answers — because **authored content (`phrases-el.json`) and the derived guess pool (fixed-length `words-N.json` lists) have no structural link.** A phrase can be written using any word; the pool only stocks lengths 1–8, and only what the dictionary happens to contain. Nothing failed loudly: the puzzle rendered fine and only the correct answer was refused.

`phraseCorpusPlayable.test.ts` now closes it for this game, but **the same shape exists wherever authored data meets a derived list.** Leksindeseis puzzles, Topothesies answer names, and the Leksoplegma/Leksodromia reuse of Leksiarxeio's answer pools all pair hand-written content against generated data. Worth a sweep: does each of those have a test that drives the *real* validator over the *whole* authored corpus? A per-item unit test does not catch this — only the full-corpus pass does.

Related trap, same session: a derived file can be **regenerated empty**. `words-1.json` had to be authored and deliberately placed outside `src/data/leksiarxeio/`, because the re-sync adapter rebuilds those from `words-el.json`, which has no single-letter entries. Any future "just add a list" instinct should first ask whether a re-sync owns that directory.

### Leksindeseis "one away" UX gap
The reducer detects "one away" and sets feedback text, but `GroupGrid` has no visual highlight indicating _which_ group the player is close to. NYT shows colour intensity. Consider adding in Phase 4 polish.

### Custom URL word count warning
The `/leksokipos/[center]/[outer]` route shows a banner if `validWords.length < 5`, but there is no lower bound that triggers a 404 — a player can construct a URL that yields 0 valid words. The UX is honest (warning banner), but consider whether to 404 on 0-word combos instead.

### Greek letters in URLs
Modern messaging apps (WhatsApp, Telegram, iMessage) and all mainstream browsers handle Greek path segments correctly via IRI/percent-encoding. Edge risk: some old email clients or corporate proxies may mangle `%CE%B1`-style sequences. Acceptable for the current use case; document if a user reports it.

### 🟡 API rate limiting (accepted risk)

All INSERT-capable API routes write to Supabase with no per-device throttle; RLS allows unlimited
anon inserts. At current scale that is accepted — the likely abuse vector is a client bug, not an
attack. **Accept and monitor**; revisit with Redis sliding-window rate limiting above ~500 DAU.
Scope is **INSERT spam only** (sharpened 2026-07-16): the adjacent anon UPDATE/DELETE exposure was
never part of this decision and is closed by migrations `20260716120000`/`120100`/`120200`.

**The monitoring half took three tries to state correctly, so read only this paragraph.** The
original mitigation was "set a Supabase row-count alert at 50 000 `game_scores` / 5 000
`nominations`". **That alert cannot be built on any plan** — Supabase tracks no row-count metric
anywhere, and Free has no user-configurable threshold alert at all (only an automatic
quota-exceeded email at 100%, and the Metrics API behind Prometheus/Grafana). So the decision was
conditioned on a control that never existed to configure, and for months nobody noticed because
"the operator will set it up" reads like a completed step. The **operator-accepted substitution
(2026-08-13)** is one SQL read folded into the existing ADR 0023 habit — same cadence, same
operator, no new machinery. `TICKET-09` is closed. Do not go hunting for a dashboard alert:

```sql
SELECT (SELECT count(*) FROM game_scores) AS scores, (SELECT count(*) FROM nominations) AS noms,
       pg_size_pretty(pg_database_size(current_database())) AS db_size;
```

**Measured 2026-08-12** (`execute_sql`, live DB) against the Free ceilings read off supabase.com/pricing,
with the two dashboard cells filled in by the operator 2026-08-13:

| | now | Free limit | at limit |
|---|---|---|---|
| Database size | **27.37 MB** (dashboard figure — this is the billed one) | 500 MB | **5.5%** |
| MAU | **8** auth users, lifetime | 50 000 | 0.02% |
| File storage | **0 bytes, 0 buckets** | 1 GB | 0% |
| Connections | **22 in use at idle** | 60 (`max_connections`, Nano) | 37% |
| Egress | **~5 MB/day, peak 11 MB → ~150 MB/mo**; cached egress zero | 5 GB/mo | **3%** |
| `game_scores` | **505** rows | (the 50 000 tripwire) | 1.0% |
| `nominations` | **189** rows | (the 5 000 tripwire) | 3.8% |

**Trust the dashboard's size number, not `pg_database_size`.** The SQL read said 13 MB and the usage
page says 27.37 MB for the same database on the same day. The dashboard figure is what bills and
what trips the read-only cliff, so the SQL row-count query is a *row* tripwire only — take size from
the usage page. The measured egress landing on ~150 MB/month is the estimate below confirmed, not a
coincidence worth re-deriving.

**Traffic estimate, stated so it can be argued with:** 50 active days hold 505 scores from 51
lifetime devices — a 30-day mean of **10.5 scores/day across 8.9 distinct devices**, so **≈1.2 score
rows per player per day**. A soft launch to a wider circle plausibly lands 30–50 daily players; the
arithmetic below uses **50/day**, a deliberately generous 5.6× the measured figure. At 50 players a
day: 60 score rows/day at a measured **730 bytes per row including indexes** ≈ **16 MB/year**, so
the 500 MB ceiling is **~25 years** away and the 50 000-row tripwire **~2.3 years**. Egress at an
estimated ~100 KB/player/day is ~150 MB/month, **3%** of 5 GB; it needs roughly **1 700 players/day**
to bind.

**The binding constraint is not one of the four quotas.** Ranked:

1. **Nano compute — shared CPU, 500 MB RAM, 60 connections with 22 already gone at idle.** A
   performance wall rather than a quota, so it has no gauge, no percentage and no email. It is what
   actually degrades first.
2. **Database size, because of *how* it fails.** Free enters **read-only mode above 500 MB, with no
   grace period** — `cannot execute INSERT in a read-only transaction`, i.e. every score post 500s
   and the Platform silently stops recording. Twenty-five years away on the estimate; the only thing
   that shortens that is a write loop, which is precisely the INSERT-spam risk this entry exists for.
   That coupling is the reason the row-count read is worth keeping despite the comfortable margin.
3. **Egress**, ~1 700 players/day.
4. **MAU is structurally unreachable, not merely distant.** It counts Supabase Auth logins and token
   refreshes only; the Platform's players are anonymous device ids that never touch Auth. Google
   sign-in is optional and has 8 lifetime users. Cross it off rather than tracking it.

**Trigger for moving to Pro** — not a row count: database size crossing **250 MB** (half the
read-only cliff), *or* the first sustained slowness report (constraint 1, which no number here will
warn about), *or* wanting PITR, which is `ISSUE-01`'s real fix rather than a capacity decision.
The Redis rate-limiting trigger (~500 DAU) is untouched and still out of scope.

### 🟡 Topothesies — the gate that guards the geo pipeline is weaker than it looks (s136)

The content is done (see the memory row + ADR 0018). What stays watchable is the machinery:
**`validateEmitted` checks that the data is well-formed, not that it is right.** Two different wrong
polygon-selection rules shipped through it clean — one gave Κουφονήσια a bare rock, the other gave it
the island of Νάξος and silently stripped the parent — and both produced the right counts, valid ids,
in-bbox centroids, no accents. **No gate in this repo can tell a correct silhouette from a plausible
one.** What caught both was reading the generator's own diagnostic numbers. Any geometry change needs
those numbers read and the shapes eyeballed in the preview; green output means nothing here.

The peel is the only place a child can silently steal from its parent, and **the parent's damage is
the invisible half** — its centroid and outline change with no error anywhere. Do NOT "fix" the share
card's Worldle emoji grid: it is deliberate, and only the on-screen surface was de-emoji'd.

### 🟡 Πόσο κάνει; — engine built, awaiting real content (s124)

The whole slice ships `wip:true` on **one placeholder puzzle** (Αγγούρι + an authored SVG). It is functionally complete but cannot go live until real dated puzzles exist — photos (open-license / own, never the gov `image_url`) + frozen gov reference prices. **Nothing tracks this any more** — issue 13 and the `posoKanei.md` handoff it absorbed were both deleted on 2026-07-31 when the launch map replaced the issue list, and neither that map nor its successor (`.claude/handoffs/launch-readiness.md`) carries content sourcing. The gov API details, the item list and the unresolved branded-photo policy exist only in git history; this section is the live summary. File a ticket in `.claude/tracker/tickets/` before starting the work. Flip `posokanei.wip:false` only after content + an operator play-through. Placeholder honesty: the sample photo/license strings say «Δείγμα / placeholder» on purpose — don't let a real-looking price slip in without a real source.

### 🟡 Λογοπαίγνιο — foundation only, two open risks carried forward (s126)

Tickets 01 (foundation) + 02 (playable UI, s127) shipped `wip:true` on one placeholder (fake «Δείγμα» brand + authored SVG — no real trademark yet). The game is now fully playable; tickets 03 (first 30 real brands), 04 (legal note + live flip) remain. Two risks are **decided but not yet discharged**:
- **Legal (highest).** Every real logo is a trademark/copyright with no clean license story (unlike ODbL boundaries / own-shot photos). Ship-anyway is the conscious call, mitigated by a takedown path + a risk note that MUST be written into `CONTEXT.md`/an ADR at the wip→live flip (ticket 04) so a future session knows it was deliberate. Reassess if the game gets real traffic.
- **Matching complaints.** Even with `normalizeAnswer` (accent/case-fold + whitespace-strip) + per-brand `accept[]`, expect "I knew it but it said wrong" reports on bilingual names. Lever = generous accept-lists; if it persists, add a post-solve "we also accept: …" line. Budget puzzle-authoring time on accept-lists, not on finding companies.
- **Pool reachability — eased, and the bottleneck MOVED (s130).** 144 assets are staged against a 150 floor, helped by dropping the Greek-origin rule. Sourcing is no longer the risk; **curation is**: 0 of 144 are approved, and many are still full logos with the name attached. The remaining work is the eye check + wordmark stripping, which no script can do. Watch for the temptation to bank "144" as progress toward 150 — the honest number is 0 until marks are cropped and approved. If the pool still stalls, relax "recognizable" before "icon-only" (relaxing icon-only breaks the game outright). Blur difficulty stays a `BLUR_STEP_RADII_PX` knob.
- **Automated sourcing is confidently wrong, and only verification catches it (s130).** Commons search matched ΔΕΗ to "Namibia Power Corporation" and ΣΤΑΣΥ to a Lithuanian choir — plausible-looking files, downloaded and presented as correct. Two of my *own* checks were also wrong until measured: the duplicate detector reported 48 false duplicates, and an HTML error page was saved as `logo.svg`. Nothing here is covered by the test suite (it is all `scripts/`), so the only defence is measuring the artifact rather than trusting the response. Any future expansion of this pipeline should assume its own output is wrong until checked.

### 🟡 `coverageMap.md` is stale by roughly 31 files

It covered 153 of 184 test files when it was moved back to `.claude/aiHelper/coverageMap.md` on
2026-08-03, and no Dream since has reconciled the remainder. Grep it before writing a test, but do
not read a miss as proof no test exists.

*(The move itself is resolved. The process lesson survives it: **when a mandated artifact is
missing, search for it by name before concluding it does not exist** — `git log` on a missing path
reports the containing directory's commits, which reads exactly like "deleted, never committed",
and I nearly recommended deleting a rule on that basis.)*

**s157 — the failure mode is worse than incompleteness.** Three entries did not merely omit a test,
they **described tests that do not exist**: an "is_perfect latch" in `useScoreSubmission.test.ts`, an
`isPerfectRound` in leksoplegma's `scoring.test.ts`, and "single live score post + is_perfect" in its
`board.test.tsx`. The perfect-round wire was deleted in s108; the map has claimed coverage of it for
seven months. A gap makes you write a test you may already have — a **wrong entry makes you trust
one that was never there**, and the instruction to grep before writing turns it into a load-bearing
lie. Corrected. When the Dream updates this file, re-read the rows it touches rather than only
appending new ones.

### 🟡 ADR 0010's premise is dead; the ADR is not (s132)

Both service-worker rejections rest on "warm start needs only route prefetching." That is false.
The ADR now carries a ⛔ block, and `e2e/offlineMode.spec.ts` is skipped-and-failing as the
acceptance test for whatever replaces the mechanism. Two things to hold onto:
- **Don't patch around it.** Re-prefetch timers, retry wrappers and longer warm-up loops all depend
  on the same cache expiry we don't control. The honest options are a service worker or accepting
  single-page scope.
- **Single-page protection is genuinely useful** and is what ships. Don't let the failed half
  discredit the half that works — the round-loss-on-refresh problem is real and now solved.
- Still unverified on a real device: `beforeunload` on iOS Safari, and OS tab eviction (which never
  fires it at all — the mount-flush safety net is the only cover). Checklist in
  `.claude/handoffs/offlineFeature-handoff.md`.
- **PARKED 2026-08-04.** Operator chose hide-don't-revert: the code is proven isolated (every
  touchpoint is an `if (offlineActive)` branch, default false), so hiding the toggle is enough to
  unblock a production push while keeping a working implementation to revive. The risk to watch is
  **dormant code rotting** — nothing exercises the offline branches now except the unit tests, so a
  future refactor can silently break them and no gate will complain. The parked-state Shell tests
  are the tripwire for a *partial* revival (toggle back without the nav guard = lost rounds).

### 🟡 A latent defect is a design question nobody has answered yet (s134)

`consumeApprovedPuzzle` ignored its date and deleted the row it served. Both were
outright bugs, and neither had ever fired — because every queue held zero approved
rows. The code was written for a world where "the next community puzzle" was a
queue position, and the date was scenery. **That is what a feature looks like
before its central question has been asked**, and the question here was never
"FIFO or LIFO?" but "*when* does an approved puzzle go live?" — which has no
answer in the code at all, only in the operator's head.

Two things worth carrying:
- **Zero rows is not reassurance, it is the reason to look.** The defects were
  invisible precisely because the feature was unused; the first approval would
  have destroyed a puzzle on the submitter's own refresh. Any lifecycle whose
  later stages have never run in production should be read as unverified, not as
  working. Stavrolekso's `pending` row is the live reminder — one approval away.
- **The type system found the design boundary I had missed.** `.eq("scheduled_date")`
  refused to compile because `CommunityPuzzleTable` includes Stavrolekso, which
  never consumes. I first misread the truncated error as a stale build cache and
  cleared `.next` for nothing — the error had named all four tables and I stopped
  reading at the `...`. The fix (`ScheduledPuzzleTable`) is better than the
  convention it replaced. **Read the whole compiler error before theorising about
  the toolchain**; ADR 0017's generated types keep paying out, but only if I let
  them talk.

Still open: the admin approves blind (operator's call — review UI untouched), so
there is no in-app way to see or change the schedule. If a puzzle ever lands on
the wrong date, the only remedy today is direct SQL. Worth revisiting if approvals
become frequent.

### 🟡 Two round spines — the split must be defended, not drifted into (s128)

`useSlotFillRound` (topothesies/posokanei/logopaignio/leksoplegma) now sits beside `useGuessRound` (leksiarxeio/vrestifrasi) as a deliberate **sibling**, not a generalisation — ADR 0019 states why. Three things to watch:
- **The merge temptation.** A future session seeing two similar hooks may try to unify them. Don't: the union of both option sets is a wide, mostly-optional interface, and each call site would pay for concepts it doesn't have (`status` for slot-fill, `hasLiveActed` for guess). If a *new* game genuinely needs `gaveUp` **and** `won/lost`, that's the signal to re-examine the split — not a reason to pre-emptively widen either spine.
- **Leksoplegma migrated (s129) — one real non-migration left.** `useLeksoplegmaRound` is now the fourth member (arch-review → `/tdd`, under an integration safety net). Its genuine variation is inside the reducer — `RESTORE_STATE` filters restored words against the current puzzle — not in the spine; the migration preserved it (test row locks it). `useLeksodromiaRound` must **never** be migrated: its clock, reset-on-advance effect, and restore-interleaved-with-`reset()` are real machinery, not copied ceremony. Deleting that distinction would be a regression disguised as consolidation.
- **The page above the spine is a different axis, and s141 proved it.** A proposal arrived to collapse "the Slot-Fill page shell", scoped to the slot-fill family and careful to say it did not contradict ADR 0019. Its own file list already contained Λεξοδρομία — the one game the ADR names as a permanent non-member. The duplication was real but it was **page chrome**, which has no relationship to the round spine: `GamePageChrome` ended up with six members spanning *both* families and excluding Leksiarxeio for a reason (a server-rendered self-triggering modal) that has nothing to do with rounds at all. The lesson is not "the proposal was wrong" — it is that **an existing seam's vocabulary will be reached for to describe a new seam**, and the borrowed name then smuggles in the old boundary. Check the member list against the name before believing either.
- **The snapshot memo is load-bearing.** Keying it on the projected *values* (not the state object) is what keeps localStorage writes tied to real progress; memoizing on `state` writes on every keystroke. The regression test in `useSlotFillRound.test.ts` is the only thing standing between a future "simplification" and a per-keystroke write. The ref-based alternative is a dead end — `react-hooks/refs` rejects it.

### 🟡 A checklist item a guard test can hold should become one — then the checklist gets rewritten

Found via `leksindeseis`, which carried `wip: true` since the registry was written while README,
`memory.md`, `goals.md` and `CONTEXT.md` all called it Live. Operator's call: the code was right.
The durable half is **read the registry, never the prose, for a Game's real status** — and that
graduating a Game is a checklist, not a one-line edit.

**The checklist has since shrunk, and the shrinking is the interesting part.** It was *registry flag
+ `Shell.tsx GAME_IDS` + HomeTrophy branch + docs*. Two are now closed **by construction** rather
than by discipline: `GAME_IDS` no longer exists (both surfaces derive from the registry and filter on
`hidden`, probe-tested in `registryCoverage.test.tsx`), and the HomeTrophy branch derives from
capabilities (ADR 0020). Genuinely manual still: **both** flags (ADR 0022 made them orthogonal, so a
flip is two decisions), the accent row, the capability grant, content supply, docs. **A stale
checklist teaches a future session to hand-edit something the compiler already owns.**

### 🟡 Deferring a threshold on a live-capture counter destroys data (s139)

The immutability rule everyone has internalised — *lower is safe, raise is impossible* — is about
**earned rows**. It says nothing about **unwritten** ones. `theristisFoundRatio` had to move
0.8 → 0.7 in the ticket that built `player_milestones`, not the later one that read it, because
milestone rows are written only as days are played: every qualifying day in the gap would have been
lost permanently. The spec had the change correctly scoped to the later ticket and never noticed.

Any counter added ahead of the badge that reads it needs the same question asked: **what is not
being recorded in the gap?**

### 🟡 A retired id is not gone — it is still sitting in your fixtures (s140)

Removing two achievement ids from the catalog broke **8 test files**, and only two of those
breaks were about the badges. Everywhere else the ids were just *arbitrary valid strings* a past
session had reached for — `authLinkRoute`, `achievementMerge`, `achievementsRoute`,
`gameScoresRoute`, `profileBadgeRoute`, `achievementToast`, `leaderboardBadge`. They read as
noise to fix, but two of them were not:

- **`profileBadgeRoute`'s "saves a one-shot" and `gameScoresRoute`'s "one-shot resolves to
  `tier: null`" were testing a shape the catalog can no longer produce.** Once every entry is
  tiered, those cases cannot arise from real data. Swapping the string would have kept a green
  test that asserts nothing reachable; they had to become genuinely different scenarios. **When a
  fixture stops compiling against reality, ask whether the test still describes a possible
  world** — a mechanical rename is the tempting wrong answer.
- **A blanket `sed` over `TrophyCase.test.tsx` rewrote the *selected* badge id into a tier id.**
  Selection stores the BASE id and always has; the sed could not know that. It went green-adjacent
  and failed loudly, but a slightly different sed would have passed while encoding a wire format
  the route rejects.

The durable point: **the blast radius of retiring an id is not "the badge code", it is every
place that ever needed a plausible id.** Nothing marks a fixture as arbitrary, so grep is the only
map, and each hit needs a judgement call rather than a substitution.

### 🔴 A loose API stub does not fail the test — it empties the page (s140)

An unguarded `.map` over `data.buckets` and a `.toLocaleString()` on `stats.total_points` both
threw mid-render when a stub omitted those fields, so React unmounted the whole tree and the
assertion reported an **empty body** — which reads exactly like "the section was never added", the
failure the test existed to rule out. Two rules: **a page-composition test needs REAL response
shapes**, never `{}` or a plausible-looking object; and **when a component test shows an empty
container, read the exception trace before the assertion** — jsdom reports the crash *after* the
query timeout, so it is easy to miss.

### 🟡 Word-length ladder may be near-unearnable + a thin card (s125)

The word-length badges are **exact length** (operator's choice): a word of exactly 12 or 13 letters is genuinely rare on a Leksokipos board, so the 12/13 rungs may almost never earn, and a 14+ monster earns nothing at all. Same reason the "Λέξεις ανά μήκος" card (now 10/11/12/13+ only) will read near-empty for most players — most of a round's finds are short. Both are acceptable given the change's real goal (cap `player_words` growth, resolved issue 14), but if the badges feel dead or the card feels barren post-launch, the lever is `achievementTuning.wordLengthBadges` (drop to `[10,11,12]`, or make the top rung "13+") — everything (buckets, floor, detection, catalog) re-derives from that one array.

---

---

## ✅ Resolved Tensions (archive)

- **`game_state`’s 350:1 update ratio (s155, judged and closed)** — 29,025 updates against 83 live rows looks like a fire; the correct response was **leave it alone**. Cause is real (Leksokipos writes twice per word and `pushFoundWords` posts the whole array, ~820 word-slots to persist 40), but at 1,000 daily players that is ~80,000 upserts/day, **under one write per second**, with same-day autovacuum. **A ratio is not a verdict** — it means nothing until multiplied by projected load against the ceiling. `TICKET-12` holds the fix with its threshold in the title; re-run the measurement before opening it, and note that sending deltas is blocked by ADR 0003’s server-wins restore ✅
- **Stripping the emails from the dump (s154, settled)** — a data-minimisation instinct pointed at the wrong artifact: `pg_dump --schema=public` yields an archive that satisfies a privacy intuition and **fails at the one job it exists for**, since restored rows point at accounts that no longer exist and every signed-in player returns a stranger to their own history. **A minimisation instinct and a recovery requirement can point in opposite directions, and minimisation feels more responsible while being wrong.** Encryption reconciles them; deletion does not ✅
- **Vercel Fluid Active CPU as the binding cost constraint (s144, resolved 2026-08-13)** — measured over a full billing period at **1.19 CPU-hours ≈ $0.35, ~2% of the $20 Pro allocation**; the old "4h/day cap" framing is obsolete. Mitigations that must not be undone: the module-level `validWordsCache` in `buildCustomPuzzle`, `revalidate = 3600` on the custom route, Edge runtime on all API routes. **Settled:** stripping `validWords` from `puzzles-el.json` saves 4–10 ms of parse and costs 50–200 ms of dictionary computation per puzzle ✅
- **Mobile input path for Leksiarxeio** — `keyboardInteraction.test.tsx` now verifies the on-screen keyboard dispatches end-to-end (letter click → pending tile, ⌫ → removal, ↵ → submit). Verified during the 2026-07-02 test audit ✅

- **`dark:` Tailwind classes** — re-enabled safely via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. The prefix fires only when `.dark` is on `<html>` (never from `prefers-color-scheme`). `useTheme` hook owns the toggle; preference lives in `localStorage["theme-preference"]` outside the game-state envelope. ADR 0002 documents the decision ✅
- **`FeedbackBanner` graduation** — triggered by Leksindeseis needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — graduated: the real implementation is now `src/lib/normalize.ts` and every caller imports `@/lib/normalize`. `src/games/leksokipos/lib/normalize.ts` survives only as a two-line re-export shim ✅
- **Leksiarxeio answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅
- **The rejected module, rejected on the proposal's own evidence (s153)** — the extraction was wrong about its headline scenario (no corpus gaps exist; a test has guarded that since s131) and its count (eight implementations, three already sharing a miss rule), both one command to check, and checking turned the deliverable from an interface into an invariant plus a test. Lesson kept: **"N places do X" is a claim about rules and is usually measured in shapes** — shapes duplicate far more often than rules, and only duplicated rules justify an interface ✅
- **Sound Cues built and mute (s145/s146)** — the tension was that a merged toggle playing silence could not be cut for free, guarded only by `TICKET-05`'s "neither ticket deploys alone" line. **Resolved s154**: `FEATURE_FLAGS.soundCues` (off) hides the 🔊 button, so the code is inert rather than visibly broken and the human-read deploy gate is spent. The MP3s are post-launch and optional ✅

