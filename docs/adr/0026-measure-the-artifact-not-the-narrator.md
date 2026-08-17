# ADR 0026 — Measure the artifact, don't trust the narrator

**Status:** accepted (2026-08-17)
**Promoted from:** `.claude/aiHelper/reflections.md`, where this ledger had grown to roughly a third
of the file and was blocking the 120-line cap that every other agent file already had.
**Why an ADR and not a reflection:** ADRs and `log.md` are dated history and stay true after the
thing they describe is gone (`CLAUDE.md`, one-fact-one-owner). This ledger is history — sixteen
recorded instances across s130–s164 — and it stops growing linearly with the file a cold session
must load every time.

## Context

This repo's most expensive recurring failure has one shape: **a claim that is plausible,
load-bearing, and cheap to check is believed instead of checked.** What varies is only *who is
narrating* — an external API, a type signature, a tool, a test file, the repo's own issue files, the
agent's own persisted memory, the agent's own probe, the operator. The point of keeping one ledger
rather than nine separate reflections is that the list of narrators is now long enough to stop
treating any of them as reliable.

## Decision

**Before a claim decides something, spend the one command that confirms it.** The check is almost
always one `Read`, one `grep`, one query, or one A/B. Where a spec names a *tool* as its mechanism,
the check is calling the tool — nothing about reading the spec prompts that, which is why those
instances cost the most.

## The ledger

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
| s156 | **The repo's own issue file** | ISSUE-08: adding `display_name` to the badge `in()` "makes the stored copy redundant" | **19 of 52 scoring devices have no `player_profiles` row at all** — a device only gets one once it sets a name or picks a badge, so dropping the copy would have blanked a third of the leaderboard | one `SELECT count(*)` |
| s158 | **An issue file, and then me repeating it** | ISSUE-09: `data.words` is "the only record of a round's total word count", the one argument against removing the write | `flushOutbox` posts **without** `data` (`offlineOutbox.ts:115-121`), so every Score queued in Offline Mode already landed `{}` — a lossy record, not the only one. The operator supplied it; I had restated the claim as fact | **read the other writer** |
| s159 | **An issue file** | ISSUE-01 §2's verification "needs a scratch database the shared project does not give us" — a blocker inherited unexamined through two rewrites and a consolidation | a scan-vs-index crossover is **Postgres behaviour, not Supabase behaviour**, and PostgreSQL 18 was already installed on the machine for `pg_dump`. Nothing was ever blocked | `command -v psql` |
| s159 | **Me, past output I had already generated** | "ISSUE-09's content was lost in the fold — the ledger points at a §4 that does not exist" | it was **fixed** in `2f4cf77`, and that commit was **visible in the `git log --oneline` I had run one call earlier**. The ledger row was mislabelled, not orphaned | **read the output you already have** |
| s160 | **My own probe** | `pg_isready` returned *accepting connections*, so I told the operator the index measurement could be run now | listening is not authenticated: every `pg_hba.conf` line is `scram-sha-256` and the only password to hand was Supabase's. **The check I ran was adjacent to the claim I made** — the first ledger row where the measurement was real and simply answered a different question | open the connection, don't ping the port |
| s164 | **An issue file's own section titled "The cause, measured"** | ISSUE-10: the two slow tests cost "35–60 ms per click — jsdom event dispatch plus a React re-render of the whole board" | the timings and the linearity in click count were real and reproduced exactly. **The cause bolted to them was never measured.** It was userEvent's default `delay: 0` yielding to the macrotask queue: `delay: null` took 40 clicks from 1951 ms to 312 ms, while killing the pointer-events check moved nothing. All three fixes the file proposed (raise the timeout, bypass the DOM, shrink `WORDS`) would have kept the slowness | **A/B one knob at a time** |

## What the ledger makes visible that no single row did

- **A mock is a claim about someone else's contract.** If the claim is wrong the test is worse than
  absent, because it manufactures confidence (s132, s140). **Any feature whose value depends on
  browser or runtime behaviour needs one real-browser test before it is called done.**
- **A citation to a named artifact in this repo reads as verified and almost never is** (s146 twice,
  s148). A ticket's file list is a hypothesis; grep is the map.
- **A spec's stated reason can be false while its decision is right** (s139, s150, s156, s161) —
  the dangerous version, because the decision surviving review is taken as the reason surviving it.
  s156 is the sharpest form: ISSUE-08's *decision* (resolve names at read time) was correct and
  shipped unchanged, while the sentence justifying it was false, and implementing the issue as
  written would have caused a worse bug than the one it fixed. **An issue file is a hypothesis with a
  number on it, not a design review that already happened.** The check that saved it took one query
  and was prompted only by asking "what does this read return for a row that has no match?" — the
  question every read-time resolution owes.
- **The same shape arrives from the operator, and that is the cheapest version to get wrong (s161).**
  A bug report said a purple tile should be grey *because the third word has no Α*; the verdict was
  right and the reason was its exact inverse — the third word is ΔΙΔΑΣΚΩ, it *does* hold an Α, and
  that Α is why the purple rendered at all. Agreeing would have produced a "fix" aimed at suppressing
  cross-word purple rather than at claim ordering, and it would have looked confirmed by the very
  screenshot that prompted it. **Reproduce the reported symptom before adopting the reporter's model
  of it.** A correct conclusion is not evidence of a correct diagnosis.
- **A heading can borrow credibility numbers earned (s164).** ISSUE-10 carried a section called
  *The cause, measured* whose numbers were genuine, reproduced to the millisecond, and whose causal
  sentence was pure assertion sitting inside that credibility. **A measurement tells you how much,
  never why**; the why needs its own experiment. Grep a doc for the word "measured" before trusting
  it — it marks where someone stopped.
- **"The only record of X" is a claim about every writer, not the one in front of you** (s158). A
  field's completeness is decided by the *quietest* path that writes the row — here an offline flush
  that omits it — and that path is never the one the issue cites. **Before calling data
  irreplaceable, list every writer.** Note which way the error ran: the claim made removal look
  costlier than it was, so an unchecked fact can defend the status quo as easily as license a change.
- **A stale artifact can be wrong in both halves at once** (s155). The memory named a defect *and*
  the tracker file supposedly holding it; the defect was fixed and the number had been reused for
  something else. A citation carrying its own reference number reads as *more* verified than a bare
  claim, and the number is exactly the part that rots. **Check the file, not the number.**
- **Escalating cost of the check.** Seven instances were one `Read` or one `grep`. s150 was not: a
  tool-reachability claim can only be checked by *calling the tool*. **A spec that names a tool as
  its mechanism should have that tool invoked before the spec is believed.**
- **A blocker outlives the rewrites that pass over it** (s159). "Blocked on the dev/prod split"
  survived two rewrites of `ISSUE-01` and a four-way consolidation, each pass editing the prose
  around it while treating the dependency as settled. It was one `command -v psql` from false the
  whole time. **A `Blocked by:` line is the highest-value claim in any tracker file and the least
  often checked** — it is what stops work from starting, so nobody reaches the point of testing it.
- **The cheapest check is the output you already have** (s159). The only row where the check had
  *already been run*: `git log --oneline -5` printed the fix commit one call before I wrote that its
  content was lost. **Running the command and reading the command are different acts.**

## Two narrators are ours

**Our own hedging adjectives.** The Leksindeseis fallback pool was called "thin" for weeks across
three docs, in the tone of something surveyed — it is **one puzzle** rotating over a single-item
array, so every unscheduled day serves the identical board (one `require()` settled it). The same
session, "the legal surface" and "error monitoring" turned out to mean *nothing exists at all*.
"Thin", "minimal", "sparse", "a few" read as the output of a count and almost never are; they are
worse than a wrong number, because a wrong number invites checking and a vague word invites
agreement. **Replace the word with the number before deciding**, and when writing one, either put the
number in or say it was never counted.

**A hazard we named ourselves and then stopped querying.** `TICKET-07` warned that installing error
monitoring *later* would falsify `/privacy`'s "no third-party tracking" line — sound, well-argued,
and aimed at the wrong time: `FeedbackModal.tsx` had been posting the URL and user agent to
`formsubmit.co` since it was built. The line was already false, and both the ticket and the launch
handoff had encoded the phantom dependency as a sequencing constraint, which is how a missed fact
becomes scheduling. **When a ticket warns that some future change would make a claim false, first
check whether the claim is true today** — the correcting question is not "which order?" but "is it
already happening?" Second-order, because it changed the design: the honest fix was not a longer
disclosure but dropping two of the four fields. A privacy page is the one document where shrinking
the truth beats describing it well.

## The visual corollary — a preview is evidence about the renderer that drew it

Recorded s144/s162/s163/s165, same family. **For anything whose failure mode is "looks wrong", the
test suite's job is to lock the decisions, not to prove the result.** jsdom has no layout engine, so
nothing here can tell a correct badge from a plausible one; what *can* fail silently is a Tailwind
class that never compiles, which is why s144 grepped `bg-tier-chryso-soft` and the ring width **out
of the production CSS bundle**.

- **s143's method** — put the decision in `.claude/aiHelper/html/` and let the operator look — is the
  standing gate. s151 found half those pages unreadable on the operator's actual device (iOS Quick
  Look runs no JavaScript). *An output whose whole purpose is a human decision has an acceptance
  test, and it is that the human can read it.* Rule now in `memory.md`.
- **s162:** the render step was offered and declined; the letter-box outline shipped on values picked
  by arithmetic. Legitimate call, but the accepted artifact was never seen, and the last time a page
  *was* rendered for this kind of decision one answer changed on sight.
- **s163:** the render step happened and the preview itself was wrong — the HTML drew every mark
  `font-weight: 700` and CSS-scaled one 180 px master down to 32 px, and **neither survives
  `ImageResponse`**. Found in minutes by generating the real PNGs. **The artifact you look at must
  come out of the pipeline that ships it**, not a convenient imitation. It paid twice: the weight fix
  was a 12 KB subset font, which the ticket had priced at ~350 KB since s151 because it had costed
  *full Greek coverage* rather than the glyphs the mark draws. **A number that makes an option look
  unaffordable deserves the same check as one that makes it look cheap.**
- **s165:** the artifact was plain text and drawing it still overturned three answers out of four.
  Four share-summary format questions were answered in prose, then drawn as six worked examples as a
  courtesy; `3/6` fractions collapsed to one emoji per Length, spider-web cells became green blocks,
  and the platform name left the identity line entirely — that last because seeing
  `Leksarxeia · Leksiarxeio` adjacent is what made the collision obvious. **A format is a visual
  decision wearing text's clothes.** When the deliverable is a shape someone reads — a message, a
  filename pattern, a log line, CLI output — **write six real examples before asking whether the
  shape is right.**

## Consequences

- `reflections.md` keeps a two-line pointer here and holds only live, still-open tensions.
- The ledger is closed to routine appends. A new instance goes in `log.md` for the session and is
  added here only if it introduces a **new narrator class** — otherwise the existing row covers it.
- Live threads this ADR does not own, still tracked in `reflections.md`: the three owed operator
  eye-checks (Trophy Case, Shell header at four buttons, letter-box grid), and the Sound Cue
  per-file licence rule.
