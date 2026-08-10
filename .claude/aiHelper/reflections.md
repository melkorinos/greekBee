# Agent Reflections — Greek Word Games Platform

## ⚠️ Active Tensions (watch these)

### 🟡 Vercel Fluid Active CPU (primary cost constraint)
After 5 active days, Fluid Active CPU was already at 21m 7s vs a 4h/day pro-rated cap.  
Known mitigations applied (Session 25):
- Module-level `validWordsCache` in `buildCustomPuzzle` — warm instances skip the ~795 k word scan.
- `export const revalidate = 3600` on `[center]/[outer]` — CDN caches full page HTML.
- All API routes moved to Edge runtime (`export const runtime = "edge"`).

Stripping `validWords` from `puzzles-el.json` was evaluated and rejected: saving ~4–10 ms of JSON
parse time is outweighed by adding ~50–200 ms of dictionary computation on first request per puzzle.

### 🟠 The deploy window's acceptance test only proves half of it (s142, live until the window runs)
The plan for the `player_milestones` window is: `npx supabase db push`, then the Vercel deploy, then re-run the tests and confirm all 5 `rlsInvariantsLiveDb` failures turn green. **Those 5 tests, and the whole e2e suite, validate step 1 and are blind to step 2.** They open a Supabase client and talk to Postgres directly; no deployed app code is exercised. So they go green the moment the migration lands — whether the deploy succeeded, failed, or was never started.

That matters because the failure mode being guarded against lives precisely in the gap: the migration drops `player_pangrams` and `player_words`, and production serves code that writes to them until the deploy lands. A green suite would actively reassure the operator while every pangram find is 500ing. **The window needs one check that hits the deployed route** — a POST to `/api/milestones` on production, or Vercel runtime errors read for the minutes after the deploy. Until that is added, "all 5 green" should be read as "the schema changed", nothing more.

Second-order, and the reason this is worth a tension rather than a note: `dev` is currently **22 commits ahead of `origin/dev`**, so step 2 is not a button press — it is a push of a large backlog plus a build. The gap is measured in minutes at best, and whoever runs the window should size it before starting, not discover it midway.

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

### Leksindeseis puzzle supply (`puzzles-connections.json`)
Community-submitted Leksindeseis puzzles are the primary source, with `puzzles-connections.json` as the static fallback. The fallback pool is thin — operator must manually add new dated entries. No reminder system exists. Add a cron check or at minimum document the procedure clearly before going to production.

### Leksindeseis "one away" UX gap
The reducer detects "one away" and sets feedback text, but `GroupGrid` has no visual highlight indicating _which_ group the player is close to. NYT shows colour intensity. Consider adding in Phase 4 polish.

### Custom URL word count warning
The `/leksokipos/[center]/[outer]` route shows a banner if `validWords.length < 5`, but there is no lower bound that triggers a 404 — a player can construct a URL that yields 0 valid words. The UX is honest (warning banner), but consider whether to 404 on 0-word combos instead.

### Greek letters in URLs
Modern messaging apps (WhatsApp, Telegram, iMessage) and all mainstream browsers handle Greek path segments correctly via IRI/percent-encoding. Edge risk: some old email clients or corporate proxies may mangle `%CE%B1`-style sequences. Acceptable for the current use case; document if a user reports it.

### 🟡 API rate limiting (accepted risk)
All INSERT-capable API routes write to Supabase with no per-device throttle. RLS policies allow unlimited anon inserts. At current scale this is acceptable — the most likely abuse vector is an accidental client bug, not coordinated attack. Decision: **accept risk and monitor** (Option C). Set a Supabase row-count alert on `game_scores` at 50 000 rows and `nominations` at 5 000 rows; revisit with Redis sliding-window rate limiting when DAU exceeds ~500. Alert must be configured in the Supabase dashboard by the operator.
*Scope sharpened 2026-07-16: this accepted risk is now **INSERT spam only**. The adjacent-but-different exposure — anon UPDATE/DELETE table-wide via the old `ALL (true)` policies (erasable trophies/pangrams/state, the `transfer_codes` device_uuid oracle) — was never part of this decision and is closed (migrations `20260716120000`/`120100`). Dedup spam via double-submit is also DB-bounded now (`120200`).*

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
and when a game does graduate, the flip is a checklist (registry flag + `GAME_IDS` + HomeTrophy
branch + docs), not a one-line edit.

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

## ✅ Resolved Tensions (archive)

- **Mobile input path for Leksiarxeio** — `keyboardInteraction.test.tsx` now verifies the on-screen keyboard dispatches end-to-end (letter click → pending tile, ⌫ → removal, ↵ → submit). Verified during the 2026-07-02 test audit ✅

- **`dark:` Tailwind classes** — re-enabled safely via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. The prefix fires only when `.dark` is on `<html>` (never from `prefers-color-scheme`). `useTheme` hook owns the toggle; preference lives in `localStorage["theme-preference"]` outside the game-state envelope. ADR 0002 documents the decision ✅
- **`FeedbackBanner` graduation** — triggered by Leksindeseis needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — graduated: the real implementation is now `src/lib/normalize.ts` and every caller imports `@/lib/normalize`. `src/games/leksokipos/lib/normalize.ts` survives only as a two-line re-export shim ✅
- **Leksiarxeio answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅

