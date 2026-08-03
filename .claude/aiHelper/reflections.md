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

### 🟡 Topothesies — OSM swap done (s119), awaiting operator play-through

Geometry now comes from OpenStreetMap admin_level=7 (fidelity handoff CLOSED, s119); 76 answers. The only thing between here and go-live is the manual browser play-through + flipping `topothesies.wip:false` (curation is the operator's, ADR 0018 step 7). Open threads:
- **22 islands are deferred** (`DEFERRED_ANSWER_IDS`) because their OSM silhouette still isn't good enough — this is the live backlog (deferred handoff). Raising their fidelity needs a denser OSM extract, a physical `place=island` outline, or a manual trace. Re-add = delete the id.
- **Final answer set is not settled**: the target is «Νομοί και Νησιά της Ελλάδας» — reconcile against the Greek-Wikipedia νομοί list and split island collections into their own units, then label it so in the help screen. Current 76 (regional units + `attica` + islands) is a waypoint, not the destination.
- Preview gallery (`source/outlines-preview.html`) regenerated at 76 shapes for the operator's eyeball.
- Do NOT "fix": the **share card keeps its Worldle emoji grid on purpose** (renders when players paste results into messaging apps); only the on-screen surface is de-emoji'd (s118).

### 🟡 Πόσο κάνει; — engine built, awaiting real content (s124)

The whole slice ships `wip:true` on **one placeholder puzzle** (Αγγούρι + an authored SVG). It is functionally complete but cannot go live until real dated puzzles exist — photos (open-license / own, never the gov `image_url`) + frozen gov reference prices. Tracked in **issue 13** (carries the gov API details + item list + the unresolved branded-photo policy from the deleted `posoKanei.md` handoff; git history keeps the full text). Flip `posokanei.wip:false` only after content + an operator play-through. Placeholder honesty: the sample photo/license strings say «Δείγμα / placeholder» on purpose — don't let a real-looking price slip in without a real source.

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

### 🟡 Offline Mode ships unverified where it is most likely to fail (s132)

The feature is code-complete and every automated gate passes, but the two things that decide whether
it actually works for a player cannot be tested here:
- **Next 16 router-cache lifetime.** Prefetch populates a cache with its own expiry. If it evicts
  during a long flight, cross-game navigation dies exactly when the feature is supposed to be
  earning its keep. ADR 0010 already flags this as the likeliest under-delivery; handoff §13-D is
  the test. If it fails, the design needs revisiting, not patching.
- **The `beforeunload` + flush interaction on a real mobile browser.** iOS Safari is inconsistent
  about `beforeunload`, and a tab killed by the OS never fires it — the mount-flush safety net is
  the only thing standing between that and a lost score.

Resist the temptation to mark this "done" on green gates alone. The honest status is
*built, awaiting the operator's offline pass* — the same posture topothesies and posokanei sat in.

### 🟡 Two round spines — the split must be defended, not drifted into (s128)

`useSlotFillRound` (topothesies/posokanei/logopaignio/leksoplegma) now sits beside `useGuessRound` (leksiarxeio/vrestifrasi) as a deliberate **sibling**, not a generalisation — ADR 0019 states why. Three things to watch:
- **The merge temptation.** A future session seeing two similar hooks may try to unify them. Don't: the union of both option sets is a wide, mostly-optional interface, and each call site would pay for concepts it doesn't have (`status` for slot-fill, `hasLiveActed` for guess). If a *new* game genuinely needs `gaveUp` **and** `won/lost`, that's the signal to re-examine the split — not a reason to pre-emptively widen either spine.
- **Leksoplegma migrated (s129) — one real non-migration left.** `useLeksoplegmaRound` is now the fourth member (arch-review → `/tdd`, under an integration safety net). Its genuine variation is inside the reducer — `RESTORE_STATE` filters restored words against the current puzzle — not in the spine; the migration preserved it (test row locks it). `useLeksodromiaRound` must **never** be migrated: its clock, reset-on-advance effect, and restore-interleaved-with-`reset()` are real machinery, not copied ceremony. Deleting that distinction would be a regression disguised as consolidation.
- **The snapshot memo is load-bearing.** Keying it on the projected *values* (not the state object) is what keeps localStorage writes tied to real progress; memoizing on `state` writes on every keystroke. The regression test in `useSlotFillRound.test.ts` is the only thing standing between a future "simplification" and a per-keystroke write. The ref-based alternative is a dead end — `react-hooks/refs` rejects it.

### 🟡 Word-length ladder may be near-unearnable + a thin card (s125)

The word-length badges are **exact length** (operator's choice): a word of exactly 12 or 13 letters is genuinely rare on a Leksokipos board, so the 12/13 rungs may almost never earn, and a 14+ monster earns nothing at all. Same reason the "Λέξεις ανά μήκος" card (now 10/11/12/13+ only) will read near-empty for most players — most of a round's finds are short. Both are acceptable given the change's real goal (cap `player_words` growth, resolved issue 14), but if the badges feel dead or the card feels barren post-launch, the lever is `achievementTuning.wordLengthBadges` (drop to `[10,11,12]`, or make the top rung "13+") — everything (buckets, floor, detection, catalog) re-derives from that one array.

---

## ✅ Resolved Tensions (archive)

- **Mobile input path for Leksiarxeio** — `keyboardInteraction.test.tsx` now verifies the on-screen keyboard dispatches end-to-end (letter click → pending tile, ⌫ → removal, ↵ → submit). Verified during the 2026-07-02 test audit ✅

- **`dark:` Tailwind classes** — re-enabled safely via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. The prefix fires only when `.dark` is on `<html>` (never from `prefers-color-scheme`). `useTheme` hook owns the toggle; preference lives in `localStorage["theme-preference"]` outside the game-state envelope. ADR 0002 documents the decision ✅
- **`FeedbackBanner` graduation** — triggered by Leksindeseis needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — stays in `src/games/leksokipos/lib/normalize.ts` for now; Leksiarxeio imports it directly. Graduate to `src/lib/normalize.ts` when a third game needs it ✅ (tracked)
- **Leksiarxeio answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅

