# Agent Reflections — Greek Word Games Platform

## ⚠️ Active Tensions (watch these)

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

### 🟢 The rejected module was rejected on evidence the proposal itself supplied (s153)

Worth recording because it went well. The extraction proposal was wrong about its own headline
scenario (a corpus gap — there are none, and a test has guarded that since s131) and about its count
(eight implementations, but three already share a miss rule through `consumeApprovedPuzzle`). Both
were one command to check, and checking them changed the deliverable from an interface to an
invariant plus a test. The tension to keep alive is the general one: **"N places do X" is a claim
about rules, and it is usually measured in shapes.** Shapes duplicate far more often than rules do,
and only duplicated rules justify an interface.

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

### 🔴 A ticket that names a future risk is often blind to the present instance of it (s149)

`TICKET-07` carried a prominent warning block: install error monitoring after the privacy page ships
and the "no third-party tracking" line becomes false with nothing in the suite to notice. The
warning was sound, well-argued, and **aimed at the wrong time**. `FeedbackModal.tsx` had been
posting the message, the page URL, the **user agent** and the DeviceId to `formsubmit.co` since the
Feedback surface was built. The line was already false. The ticket even described the Feedback flow
elsewhere in the repo — nobody had joined the two thoughts.

The shape is worth naming because it will recur. A ticket that says *"careful, X might happen"* has
already done the hard part: it identified X as the thing that matters. The failure is that having
named X as a **hazard**, the author stops treating it as a **question** — nobody greps for X in the
present tense. Both the ticket and the launch handoff then encoded the phantom dependency as a
sequencing constraint (`08` before `07`), which is how a missed fact becomes scheduling.

Practical form: **when a ticket warns that some future change would make a claim false, first check
whether the claim is true today.** The grep costs one command and it is the same grep either way.
The correcting question is not "which order?" but "is it already happening?"

Second-order note, because it changed the design: once found, the honest fix was **not** a longer
disclosure. Two of the four fields were dropped, so the page had less to admit to. A privacy page
is the one document where shrinking the truth beats describing it well.

### 🟠 A qualitative word in our own docs is an unmeasured claim (s147)

The launch grill needed to know how bad the Leksindeseis fallback pool was. Three docs — this file,
`goals.md` and the launch handoff — had called it **"thin"** for weeks, in the tone of something
surveyed. It is **one puzzle**, dated 2026-05-12, with placeholder categories (Χρώματα, Ζώα,
Φρούτα, Μαθηματικές πράξεις), rotating over a single-item array — so every day without a scheduled
community puzzle serves the identical board. One `require()` of the JSON settled it. The same
session, "the legal and privacy surface" and "error monitoring" turned out to mean **nothing exists
at all**: no `/privacy`, no `/terms`, no `robots.ts`, no `sitemap.ts`, no `opengraph-image`, no
favicon, and exactly four production dependencies. (`/privacy` exists as of s149; the rest stand.)

This is the standing **measure the artifact, don't trust the response** rule (s130, s132, s139,
s145, s146) meeting a new unreliable narrator — not an external API, not a spec, not the consensus
of secondary sources, but **our own hedging adjectives**. "Thin", "minimal", "sparse", "some
coverage", "a few" all read as the output of a count and almost never are. They are worse than a
wrong number, because a wrong number invites checking and a vague word invites agreement.

The tell is unchanged and the check is still cheap. Practical form: **when a decision turns on a
qualitative word in a doc, replace it with the number before deciding** — and when writing one,
either put the number in or say explicitly that it was never counted.

### 🟡 Vercel Fluid Active CPU (primary cost constraint)
After 5 active days, Fluid Active CPU was already at 21m 7s vs a 4h/day pro-rated cap.  
*Measured 2026-08-13 (`vercel metrics`, whole 14 Jul – 13 Aug billing period): **1.19 CPU-hours**
(4 285 734 ms) plus 18.97 GB-hrs provisioned memory. **The "4h cap" framing is obsolete** — the plan
is Pro `planIteration: "plus"`, which has no per-metric free allotment; one **$20/month included
allocation** covers all usage-based charges. At $0.128/CPU-hour and $0.0106/GB-hr that is **$0.15 +
$0.20 ≈ 2% of the $20**. Fluid CPU is no longer the binding cost constraint at this traffic, and it
is now readable from the CLI — recipe in `/project-mcp`, which had it recorded as dashboard-only.*  
Known mitigations applied (Session 25):
- Module-level `validWordsCache` in `buildCustomPuzzle` — warm instances skip the ~795 k word scan.
- `export const revalidate = 3600` on `[center]/[outer]` — CDN caches full page HTML.
- All API routes moved to Edge runtime (`export const runtime = "edge"`).

Stripping `validWords` from `puzzles-el.json` was evaluated and rejected: saving ~4–10 ms of JSON
parse time is outweighed by adding ~50–200 ms of dictionary computation on first request per puzzle.

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

### 🟠 The deploy window's acceptance test only proves half of it (s142 — step 1 has now run, see below)

**Update (s144, re-confirmed 2026-08-14):** the 5 `rlsInvariantsLiveDb` failures are gone and that suite is
30/30 — the whole suite is green at 196 files / 2499 tests — so `player_milestones` exists in the live DB and
the migration was pushed sometime after s142. Everything below still stands, and now matters *more*, not
less: those green tests say the schema changed and nothing else. Whether the Vercel deploy that must
accompany it has happened is still unverified by any gate here.

The plan for the `player_milestones` window is: `npx supabase db push`, then the Vercel deploy, then re-run the tests and confirm all 5 `rlsInvariantsLiveDb` failures turn green. **Those 5 tests, and the whole e2e suite, validate step 1 and are blind to step 2.** They open a Supabase client and talk to Postgres directly; no deployed app code is exercised. So they go green the moment the migration lands — whether the deploy succeeded, failed, or was never started.

That matters because the failure mode being guarded against lives precisely in the gap: the migration drops `player_pangrams` and `player_words`, and production serves code that writes to them until the deploy lands. A green suite would actively reassure the operator while every pangram find is 500ing. **The window needs one check that hits the deployed route** — a POST to `/api/milestones` on production, or Vercel runtime errors read for the minutes after the deploy. Until that is added, "all 5 green" should be read as "the schema changed", nothing more.

Second-order, and the reason this is worth a tension rather than a note: at the time of writing `dev` was **22 commits ahead of `origin/dev`**, so step 2 was not a button press but a push of a large backlog plus a build. **That number is stale by design — never trust a committed commit count.** Measured 2026-08-14: `dev` is **1 ahead of `origin/dev`, `main` and `origin/main`**, so the backlog has since been pushed and the gap is now one commit. The standing point is unchanged: whoever runs the window should re-measure with `git rev-list --count` before starting, not read it here.

### 🟠 TICKET-03's marks were approved in a mock, not in the app (s143, live until the ticket ships)
Every badge decision was made against `.claude/aiHelper/html/badge-visual-grill.html`, which is a **standalone page with its own CSS**. It reproduces the leaderboard row, the Trophy Case tile and the toast closely enough to choose between options — but it is not the app. It does not use `lbBadgeChip`'s real padding and divider, the real font stack, the real row density, or the actual `globals.css` tokens; its eight tier colours are hard-coded copies. **A mark that reads at 12px in the mock is not thereby proven to read at 12px in the real chip.**

So the ticket's "done when" cannot be satisfied by the mock. Whoever builds it should render the real components early and look at them before finishing the drawings — and should expect **γραμμές to be the one that breaks first**, since it is the busiest of the five (four parts, thin tapering rails) and was already refined once from three crossbars to two for exactly this reason. Reverting to a simpler mark is a display-copy change with no id, schema or earned-row consequence, so it is cheap — but only if it happens before the ticket closes, not after players have seen it.

### 🟡 A discharged handoff is a second source of truth until it is deleted (s143)
`badgeIdeas.md` was fully discharged on 2026-08-07 — every build item shipped, every decision landed in ADR 0012/0013, `goals.md` and `launch-readiness.md` — and then **sat in `handoffs/` for three days**, because s140's Dream promoted its lessons but never removed the file. In the same window its sibling `badgeVisualSystem.md` went **stale on three facts** (a threshold, a tier ladder, and a citation to a superseded ADR amendment) with nothing flagging it, because a handoff has no mechanism that notices the world moved.

The operator caught both by asking. That is the tension: **the Dream reliably promotes content and unreliably deletes files.** `tracker/` has the rule (done means delete, git is the archive); `handoffs/` has the same need and no rule. Worth a habit at Dream time — for every handoff still on disk, name the thread that is still open, and if none is, delete it. A handoff whose decisions have all landed elsewhere is not documentation, it is a stale copy that a cold session will read as current.

### 🟡 Authored content vs derived word lists (the s133 class of bug)
Vres Tin Frasi shipped with 29% of its phrase corpus unsolvable — the game rejected its own answers — because **authored content (`phrases-el.json`) and the derived guess pool (fixed-length `words-N.json` lists) have no structural link.** A phrase can be written using any word; the pool only stocks lengths 1–8, and only what the dictionary happens to contain. Nothing failed loudly: the puzzle rendered fine and only the correct answer was refused.

`phraseCorpusPlayable.test.ts` now closes it for this game, but **the same shape exists wherever authored data meets a derived list.** Leksindeseis puzzles, Topothesies answer names, and the Leksoplegma/Leksodromia reuse of Leksiarxeio's answer pools all pair hand-written content against generated data. Worth a sweep: does each of those have a test that drives the *real* validator over the *whole* authored corpus? A per-item unit test does not catch this — only the full-corpus pass does.

Related trap, same session: a derived file can be **regenerated empty**. `words-1.json` had to be authored and deliberately placed outside `src/data/leksiarxeio/`, because the re-sync adapter rebuilds those from `words-el.json`, which has no single-letter entries. Any future "just add a list" instinct should first ask whether a re-sync owns that directory.

### Leksindeseis puzzle supply (`puzzles-connections.json`) — measured s147, and parked
Community-submitted Leksindeseis puzzles are the primary source, with `puzzles-connections.json` as the static fallback. **The fallback is ONE puzzle** (dated 2026-05-12, placeholder categories) rotating over a single-item array, so every unscheduled day serves the same board — not "thin", a placeholder. No reminder system exists. **Parked, not fixed:** the Game is `hidden: true` since 2026-08-12 (`TICKET-06`, ADR 0022), so nothing ships. This becomes live work again the moment unhiding is considered — and unhiding is a checklist (both registry flags + accent row + capabilities + content supply + docs), never a one-line edit. The drawer and picker now derive from `hidden` and are probe-tested, so the s121 "forgot `GAME_IDS`" half of that checklist is closed by construction; the content half is not.

### Leksindeseis "one away" UX gap
The reducer detects "one away" and sets feedback text, but `GroupGrid` has no visual highlight indicating _which_ group the player is close to. NYT shows colour intensity. Consider adding in Phase 4 polish.

### Custom URL word count warning
The `/leksokipos/[center]/[outer]` route shows a banner if `validWords.length < 5`, but there is no lower bound that triggers a 404 — a player can construct a URL that yields 0 valid words. The UX is honest (warning banner), but consider whether to 404 on 0-word combos instead.

### Greek letters in URLs
Modern messaging apps (WhatsApp, Telegram, iMessage) and all mainstream browsers handle Greek path segments correctly via IRI/percent-encoding. Edge risk: some old email clients or corporate proxies may mangle `%CE%B1`-style sequences. Acceptable for the current use case; document if a user reports it.

### 🟡 API rate limiting (accepted risk)
All INSERT-capable API routes write to Supabase with no per-device throttle. RLS policies allow unlimited anon inserts. At current scale this is acceptable — the most likely abuse vector is an accidental client bug, not coordinated attack. Decision: **accept risk and monitor** (Option C). Set a Supabase row-count alert on `game_scores` at 50 000 rows and `nominations` at 5 000 rows; revisit with Redis sliding-window rate limiting when DAU exceeds ~500. Alert must be configured in the Supabase dashboard by the operator.
*s147: **no evidence those alerts were ever configured**, which means the mitigation half of this decision may never have happened and the risk is simply unmitigated. `TICKET-09` closes exactly that gap — the alerts plus a first read of the Supabase Free-plan limits against a soft-launch estimate. The rate-limiting trigger above is unchanged and stays out of scope.*
*Scope sharpened 2026-07-16: this accepted risk is now **INSERT spam only**. The adjacent-but-different exposure — anon UPDATE/DELETE table-wide via the old `ALL (true)` policies (erasable trophies/pangrams/state, the `transfer_codes` device_uuid oracle) — was never part of this decision and is closed (migrations `20260716120000`/`120100`). Dedup spam via double-submit is also DB-bounded now (`120200`).*

#### s150 / `TICKET-09` — the alert this decision was conditioned on cannot be built, on any plan

**Supabase has no row-count alert, and not because the plan is Free.** Row count is not a metric it
tracks anywhere: the usage page bills database size, egress, MAU, storage and compute, and none of
its per-metric docs mention rows. Free additionally has **no user-configurable threshold alert of
any kind** — what exists is an automatic quota-exceeded email to the billing address (fires at 100%,
not at a number you choose) and the Metrics API behind Prometheus/Grafana Cloud, which is an
external collector plus a secret key, i.e. engineering this ticket excluded. So the 2026 decision
above was conditioned on a control that never existed to configure. **Recorded substitution:** one
SQL row-count read folded into the existing ADR 0023 monitoring habit, same cadence, same operator,
no new machinery:

```sql
SELECT (SELECT count(*) FROM game_scores) AS scores, (SELECT count(*) FROM nominations) AS noms,
       pg_size_pretty(pg_database_size(current_database())) AS db_size;
```

**The substitution was ACCEPTED by the operator 2026-08-13**, and `TICKET-09` is closed and deleted.
The SQL above is the standing control; there is no dashboard alert to look for and no future session
should go hunting for one.

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

### 🟡 Topothesies — the answer set is DONE; the gate that guards it is weaker than it looks (s136)

109 answers, live, `wip:false`. Every backlog list is empty (`DEFERRED_ANSWER_IDS`,
`DEFERRED_ISLANDS`, `CANT_PEEL_PLACEHOLDERS`) and the «Νομοί και Νησιά της Ελλάδας»
reconciliation is finished. What stays worth watching is not the content but the machinery:

- **`validateEmitted` checks that the data is well-formed, not that it is right.** Two
  different wrong polygon-selection rules shipped through it clean this session — one gave
  Κουφονήσια a bare rock, the other gave it the island of Νάξος and quietly stripped the
  parent. Both produced 109 answers, 109 shapes, valid ids, in-bbox centroids, no accents.
  The gate cannot tell a correct silhouette from a plausible one, and **no gate in this repo
  can**. What caught both was reading the generator's own diagnostic numbers — a path length
  that made no sense for a 5.7 km² island, a simplify bucket count off by one. Any future
  change to the geometry pipeline needs those numbers read, and the shapes eyeballed in the
  preview; green output means nothing here.
- **The peel is the only place a child can silently steal from its parent.** `POLYGON_PEELS`
  removes polygons from a parent answer, so a bad selection damages *two* shapes at once and
  the parent's damage is the invisible one (its own centroid and outline change with no error
  anywhere). `selectPeelPolygons` returns null rather than guess, and the generator throws —
  keep it that way. A "helpful" fallback here reintroduces exactly the failure it exists to
  stop.
- Do NOT "fix": the **share card keeps its Worldle emoji grid on purpose** (renders when
  players paste results into messaging apps); only the on-screen surface is de-emoji'd (s118).

### 🟡 Πόσο κάνει; — engine built, awaiting real content (s124)

The whole slice ships `wip:true` on **one placeholder puzzle** (Αγγούρι + an authored SVG). It is functionally complete but cannot go live until real dated puzzles exist — photos (open-license / own, never the gov `image_url`) + frozen gov reference prices. **Nothing tracks this any more** — issue 13 and the `posoKanei.md` handoff it absorbed were both deleted on 2026-07-31 when the launch map replaced the issue list, and neither that map nor its successor (`.claude/handoffs/launch-readiness.md`) carries content sourcing. The gov API details, the item list and the unresolved branded-photo policy exist only in git history; this section is the live summary. File a ticket in `.claude/tracker/tickets/` before starting the work. Flip `posokanei.wip:false` only after content + an operator play-through. Placeholder honesty: the sample photo/license strings say «Δείγμα / placeholder» on purpose — don't let a real-looking price slip in without a real source.

### 🟡 Λογοπαίγνιο — foundation only, two open risks carried forward (s126)

Tickets 01 (foundation) + 02 (playable UI, s127) shipped `wip:true` on one placeholder (fake «Δείγμα» brand + authored SVG — no real trademark yet). The game is now fully playable; tickets 03 (first 30 real brands), 04 (legal note + live flip) remain. Two risks are **decided but not yet discharged**:
- **Legal (highest).** Every real logo is a trademark/copyright with no clean license story (unlike ODbL boundaries / own-shot photos). Ship-anyway is the conscious call, mitigated by a takedown path + a risk note that MUST be written into `CONTEXT.md`/an ADR at the wip→live flip (ticket 04) so a future session knows it was deliberate. Reassess if the game gets real traffic.
- **Matching complaints.** Even with `normalizeAnswer` (accent/case-fold + whitespace-strip) + per-brand `accept[]`, expect "I knew it but it said wrong" reports on bilingual names. Lever = generous accept-lists; if it persists, add a post-solve "we also accept: …" line. Budget puzzle-authoring time on accept-lists, not on finding companies.
- **Pool reachability — eased, and the bottleneck MOVED (s130).** 144 assets are staged against a 150 floor, helped by dropping the Greek-origin rule. Sourcing is no longer the risk; **curation is**: 0 of 144 are approved, and many are still full logos with the name attached. The remaining work is the eye check + wordmark stripping, which no script can do. Watch for the temptation to bank "144" as progress toward 150 — the honest number is 0 until marks are cropped and approved. If the pool still stalls, relax "recognizable" before "icon-only" (relaxing icon-only breaks the game outright). Blur difficulty stays a `BLUR_STEP_RADII_PX` knob.
- **Automated sourcing is confidently wrong, and only verification catches it (s130).** Commons search matched ΔΕΗ to "Namibia Power Corporation" and ΣΤΑΣΥ to a Lithuanian choir — plausible-looking files, downloaded and presented as correct. Two of my *own* checks were also wrong until measured: the duplicate detector reported 48 false duplicates, and an HTML error page was saved as `logo.svg`. Nothing here is covered by the test suite (it is all `scripts/`), so the only defence is measuring the artifact rather than trusting the response. Any future expansion of this pipeline should assume its own output is wrong until checked.

### 🟡 `coverageMap.md` had MOVED, and a missing file is not the same as a lost one (s132)

The Dream gate broke because the map sat at `.claude/aiHelper/test-audit/coverageMap.md` — one
directory below where `CLAUDE.md` and `soul.md` point. **Moved back to
`.claude/aiHelper/coverageMap.md` on 2026-08-03**; the rules were always right and stay.

The process lesson is mine, not the repo's. I grepped the mandated path, got nothing, ran
`git log` on **that same missing path** (which reports commits for the containing directory, not
the file), and concluded "deleted, never committed" — then wrote a reflection recommending the rules
be deleted. A one-line `git ls-files`/`find` on the basename would have found it immediately.
**When a mandated artifact is missing, search for it by name before concluding it does not exist**,
and never propose deleting a rule on the strength of a single unresolved path.

Residual gap: the map is ~31 files stale (it covered 153 of 184 test files at the move). s132's own
rows are logged; the remainder is for a future Dream to reconcile.

### 🔴 I mocked the API instead of checking it, and shipped a no-op (s132)

Offline Mode passed 2276 tests, eslint, build and Playwright — and failed on the operator's first
real use. `router.prefetch` returns **`void`**; I wrote `await Promise.allSettled(...)` around six
`undefined`s and called the result "ready". **My unit test mocked prefetch as promise-returning, so
it could only ever confirm my assumption.** A mock is a claim about someone else's contract; if the
claim is wrong the test is worse than absent, because it manufactures confidence. One
`grep` of the `.d.ts` — which took ten seconds once I finally did it — would have caught it.

This is the third time this pattern has bitten this project (s130's Commons metadata, s130's own
duplicate detector, now this). The rule that keeps being re-learned: **measure the artifact, don't
trust the response.** For an external API that means reading its type signature before mocking it,
and it means at least one test that touches the real thing.

**What made it recoverable was the e2e loop** — a real browser with `context.setOffline(true)`. It
found a second, worse problem the unit tests structurally could not: `force-dynamic` payloads are
not cached, so cross-game offline play is impossible by prefetch at all. Note the loop needed three
harness fixes before its verdict meant anything; a red test proving the wrong thing is its own trap.

**Standing consequence:** any feature whose value depends on browser/runtime behaviour (caching,
storage eviction, lifecycle events) needs one real-browser test before it is called done. Unit tests
with mocks cannot speak to it, and green gates will actively mislead.

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

### 🟡 Leksindeseis is `wip:true` in code and was "Live" in every doc (found 2026-08-06)

A full documentation service found that `leksindeseis` has carried `wip: true` in
`src/config/games.ts` since the registry was first written, and has never been flipped — so
the picker and the Shell drawer file a finished, community-backed game under
«Υπό κατασκευή», while README, `memory.md`, `goals.md` and `CONTEXT.md` all called it Live.
Operator's call on 2026-08-06: **the code is right, the docs were wrong**; all four now say wip.

What this is really an instance of: **`wip` is a one-word flag with no gate behind it.** Nothing
tests that a game's documented status matches its registry row, and nothing prompts for the flip
when a game finishes — Topothesies needed an explicit session (s121) to remember it, and the same
session had to add the game to `Shell.tsx GAME_IDS` by hand because the flag alone would not have
shown it. Two lessons: **read the registry, never the prose, when you need a game's real status**,
and when a game does graduate, the flip is a checklist, not a one-line edit.

**The checklist has since shrunk, and the shrinking is the interesting part (updated 2026-08-14).**
It was *registry flag + `Shell.tsx GAME_IDS` + HomeTrophy branch + docs*. Two of those four are now
closed **by construction** rather than by discipline: `GAME_IDS` no longer exists — `Shell.tsx`
derives `MAIN_GAME_IDS` from the registry and filters on `hidden`, and `page.tsx` does the same, both
probe-tested in `registryCoverage.test.tsx` (s148). The HomeTrophy branch derives from the `scores`
/ `leaderboard` capabilities (ADR 0020). What remains genuinely manual is **both** registry flags
(`wip` *and* `hidden` — ADR 0022 made them orthogonal, so a flip is now two decisions, not one), the
accent row in `globals.css`, the capability grant, content supply, and the docs. The general shape
worth keeping: *a checklist item that a guard test can hold should become one, and the checklist
should then be rewritten* — a stale checklist teaches a future session to hand-edit something the
compiler already owns.

### 🟡 A spec's stated *reason* can be false while its *decision* is right (s139)

TICKET-01 justified dropping the beta capture rows with "the beta word capture is dark behind
`FEATURE_FLAGS.achievements`." That flag has been `true` since **s112**. The capture was live, had
been for weeks, and the sentence had survived a grill, an architecture review and a documentation
service that all read the file.

The decision it defended was still correct — no `player_achievements` row depends on those rows, so
dropping them un-earns nothing — but the operator was about to approve it on a premise that was not
true. **A one-line grep of the config was the whole check**, and the reason it never happened is that
the claim was plausible and load-bearing-sounding, which is exactly the profile of a claim worth
checking. Related to the standing "measure the artifact, don't trust the response" rule, with a twist:
here the unreliable narrator was *the repo's own spec*, not an external API.

Two things worth carrying:
- **Feature-flag claims in prose rot silently.** Nothing tests that a doc's description of a flag
  matches the flag. This is the same shape as the s138 `leksindeseis wip:true` find — **read the
  config, never the prose, for a flag's real value.**
- **The timing question the spec never asked.** The genuinely important find of this session was not
  the flag: it was that `theristisFoundRatio` had to move to 0.7 *now* rather than in TICKET-02,
  because milestone rows are only written as days are played. The spec had the threshold change
  correctly scoped to the later ticket and never noticed that **deferring a threshold on a
  live-capture counter destroys data**. The immutability rule everyone had internalised ("lower is
  safe, raise is not") is about *earned rows*; it says nothing about *unwritten* ones. Any future
  counter added ahead of the badge that reads it needs the same question asked: what is not being
  recorded in the gap?

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

The new `profilePage.test.tsx` reported `Unable to find "Λέξεις ανά μήκος"` with a **body
containing one empty `<div>`**, which reads exactly like "the section was never added" — the
failure I was actually trying to rule out. It was neither. `WordsByLengthCard` maps over
`data.buckets` and `LifetimeStatsStrip` calls `.toLocaleString()` on `stats.total_points`,
**neither guarded**, so a stub missing those fields threw during render and React unmounted the
whole tree. Two rounds of chasing the wrong symptom before reading the *uncaught exception* below
the assertion rather than the assertion itself.

Two things to carry:
- **A page-composition test needs REAL response shapes, not `{}` or a plausible-looking object.**
  This is the same family as s132's mocked `router.prefetch`: a stub is a claim about a contract,
  and a wrong claim here is worse than no test because the failure mimics the bug under test.
- **When a component test shows an empty container, read the exception trace before the
  assertion.** The assertion message describes the symptom; the trace names the component that
  actually died, and jsdom reports the crash *after* the query timeout, so it is easy to miss.

### 🟡 Word-length ladder may be near-unearnable + a thin card (s125)

The word-length badges are **exact length** (operator's choice): a word of exactly 12 or 13 letters is genuinely rare on a Leksokipos board, so the 12/13 rungs may almost never earn, and a 14+ monster earns nothing at all. Same reason the "Λέξεις ανά μήκος" card (now 10/11/12/13+ only) will read near-empty for most players — most of a round's finds are short. Both are acceptable given the change's real goal (cap `player_words` growth, resolved issue 14), but if the badges feel dead or the card feels barren post-launch, the lever is `achievementTuning.wordLengthBadges` (drop to `[10,11,12]`, or make the top rung "13+") — everything (buckets, floor, detection, catalog) re-derives from that one array.

---

### 🟡 A licence label everyone repeats is still an unverified claim (s145)

The Sound Cues grill set the bar at "CC0 only" and went looking. Pixabay is described as CC0 in
search results, in blog posts, and in most developers' heads. **It is not** — it is the Pixabay
Content License: no attribution, commercial use fine, but redistribution "on a standalone basis"
forbidden. Reading the licence page took one fetch. The outcome barely changed (it still clears our
bar, because a bundled MP3 is not standalone distribution) but **what would have been written into
`src/config/sound.ts` was the word "CC0", which is false**, and provenance comments exist precisely
so a future session can trust them.

This is the standing "measure the artifact, don't trust the response" rule (s130, s132, s139) in a
new costume: the unreliable narrator here is neither an API nor the repo's own spec, but **the
consensus of every secondary source**. The tell is the same each time — a claim that is plausible,
load-bearing, and cheap to check.

Live consequence for `TICKET-05`: each of the three files needs its **actual** licence recorded, not
the licence of the site it came from. Freesound in particular hosts CC0, CC-BY and CC-BY-NC side by
side, and its most famous rooster is CC-BY.

### 🟠 A spec's *trap list* is as unreliable as its reasons, and it fails at the same place (s146)

ADR 0021 and `TICKET-04` both carried the line "jsdom does not implement `HTMLMediaElement.play` — it
needs a global stub, alongside the `scrollIntoView` stub added in s123 for the same reason." Every
clause is wrong in a way that would have shipped silently: **jsdom defines `play()`**, so the copied
`if (!Element.prototype.scrollIntoView)` guard never fires and the stub would have been dead code; and
what jsdom actually returns is **`undefined`, not a Promise**, so `audio.play().catch(…)` is a
TypeError rather than a swallowed rejection. A ten-second probe test found both.

This is the s139 lesson — *a spec's stated reason can be false while its decision is right* — one
level deeper. Here the decision (stub it) was right, the reason was right, and the **mechanism**
was wrong, which is worse: mechanisms get pasted verbatim because they name a real precedent in the
repo. The precedent was real and the analogy was false.

**The same ADR did it twice, and the second one is still open.** Its consequences named
`mobileLayout.test.tsx` as the existing guard for the header growing from three buttons to four.
That file renders `HowToPlayModal` and has never touched the Shell — and no test here *could*,
because jsdom has no layout engine. So a header that wraps at 320 px is green everywhere. Both
false claims share a shape worth naming: **a citation to a named artifact in this repo reads as
verified and almost never is.** Checking one costs a single `Read`. The mitigation is an operator
eye-check on `TICKET-05`, not a test, per the s144 rule. The tell is unchanged and the check is
still cheap: **a claim about someone else's runtime is a claim to measure, not to inherit** — this
is the fourth time (s130 Commons, s132 `router.prefetch`, s139 the feature flag, now this), and the
second time specifically that a **void return dressed as a Promise** was the thing that got through.
`useSoundCue.test.ts` therefore subclasses the real `Audio` rather than substituting a fake one, and
pins the `undefined` return in its own test.

**Fifth instance, s148, and this time the artifact was a test file.** `TICKET-06` instructed "update
`e2e/games.spec.ts` for the eight-Game picker" and separately listed the files that enumerate Games.
That spec **has no picker assertions at all** — it visits three game pages directly — so there was
nothing to update and it passed untouched; meanwhile the test that genuinely broke,
`Shell.test.tsx`'s drawer assertion on `/leksindeseis`, appeared in no list. Note the asymmetry that
makes this shape dangerous: the false instruction was *harmless* (an edit that turns out to be
unnecessary), while the missing one would have shown up as a red suite blamed on the change rather
than on the spec. **A ticket's file list is a hypothesis; grep is the map.** The ticket's own
"verify, do not assume, that nothing else enumerates Games" line was the right instinct, and it was
right about `page.tsx`, `Shell.tsx` and `useOfflineMode.tsx` — it simply never ran the same check
over the *tests*.

**Sixth instance, s150, and the artifact was a tool.** `TICKET-08` justified "Vercel's built-in
observability is enough" partly with *"`get_runtime_errors` and `get_runtime_logs` are reachable from
an agent session via MCP"* — a capability claim about someone else's service, stated in the same
confident register as a claim about a file in this repo. Both tools return **403** and `get_project`
404s on every id form. The decision survived (the CLI covers it, and the privacy argument was always
the load-bearing one), which makes this the **s139 shape as well**: *a spec's stated reason can be
false while its decision is right.* Note what is new — the previous five instances were all checkable
with one `Read` or one `grep`, but a tool-reachability claim can only be checked by **calling the
tool**, and nothing about reading the ticket prompts that. Practical form: **a spec that names a tool
as its mechanism should have that tool invoked before the spec is believed**, not after the plan is
built on it.

### 🟡 Sound Cues are built and mute — the deploy gate is now the only guard (s145, updated s146)

`TICKET-04` shipped 2026-08-11: the toggle, the preference, the playback hook and all three Cues are
live in code, and **the 🔊 button renders on every page today playing silence**. `TICKET-05` — three
MP3s, sourced and ear-checked by a human — is the half no agent should do, for the s130 reason, and
is now the *only* thing between this and a deploy. The risk changed shape rather than going away:
before, an unbuilt feature could be cut for free; now the wrong deploy ships a visibly broken toggle
on eleven Games. Nothing in the test suite can see this — every gate is green with `public/sounds/`
empty, by design.

**That shape has failed here before.** «Πόσο κάνει;» is a finished engine that has sat `wip:true`
since s124 waiting on operator-sourced photos and prices, and its tracking was deleted out from
under it; Λογοπαίγνιο's 144 assets are still 0 approved. Both are cases where the code was the easy
half and the content never arrived. Sound Cues is far smaller — three files, not 150 — but it is the
same dependency.

Two guards, deliberately chosen: it is **pre-launch but explicitly non-blocking**, so it can be cut
without ceremony rather than slipping a launch; and **neither ticket deploys alone**. That second
guard is the live one now, and it lives in exactly two places — `TICKET-05`'s "done when" and the
memory.md row. **Cutting it is not free any more**: with the code merged, "cut it" means reverting
the toggle, not declining to write it.

---

## ✅ Resolved Tensions (archive)

- **Mobile input path for Leksiarxeio** — `keyboardInteraction.test.tsx` now verifies the on-screen keyboard dispatches end-to-end (letter click → pending tile, ⌫ → removal, ↵ → submit). Verified during the 2026-07-02 test audit ✅

- **`dark:` Tailwind classes** — re-enabled safely via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. The prefix fires only when `.dark` is on `<html>` (never from `prefers-color-scheme`). `useTheme` hook owns the toggle; preference lives in `localStorage["theme-preference"]` outside the game-state envelope. ADR 0002 documents the decision ✅
- **`FeedbackBanner` graduation** — triggered by Leksindeseis needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — graduated: the real implementation is now `src/lib/normalize.ts` and every caller imports `@/lib/normalize`. `src/games/leksokipos/lib/normalize.ts` survives only as a two-line re-export shim ✅
- **Leksiarxeio answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅

