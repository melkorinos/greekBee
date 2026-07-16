# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 250 lines — condense before adding new entries.

---

## Session 92 — 2026-07-16: Executed all four DB-hardening handoffs (4 migrations live, 4 commits)

**Goal:** implement the session-91 handoffs, in the operator-agreed order. All four migrations were applied via MCP `apply_migration` with committed files, because `db push` is doubly blocked: `SUPABASE_DB_URL` absent AND push would fire the deploy-coupled `20260715120100` vrestifrasi flip. Operator decisions up front: MCP path, no pre-dump (no row data touched), **PG enum over CHECK**, one commit per task.

1. **`4c8f68b` transfer codes** (`20260716120000`): dropped the anon ALL policy — server-only, deny-by-default like identity_audit; both routes on the service-role client; claim is now one conditional UPDATE returning the row (atomic single-use; follow-up lookup only picks the Greek copy); `crypto.getRandomValues` replaces Math.random. Verified live: e2e generate→claim→reuse-410→bogus-404 through a dev server, plus live-DB regressions (anon SELECT sees 0 rows past a sentinel; anon INSERT errors).
2. **`74d278e` anon RLS narrowing** (`20260716120100`): the three ALL(true) tables became per-command — achievements/pangrams SELECT+INSERT, game_state SELECT+INSERT+UPDATE. Sweep confirmed deletes were service-role-only. ADR 0013 amended (DB now enforces append-only vs anon); advisor baseline note updated in project-mcp SKILL.md. Live-DB regressions: anon DELETE = 0-row no-op ×3, upsert + DO-NOTHING insert still work.
3. **`1660d0c` dedup backstops** (`20260716120200`): UNIQUE(nomination_id, device_id) + partial unique on pending (word, direction) — session 86's deferred Option A; pre-flight showed 0 violations. Vote route: lookup errors short-circuit (the compounding-dupes bug), lost insert race re-reads → added/switched. Nominations POST: 23505 → **409 already_pending + pendingId**; NominationModal pivots to the existing upvote banner. Verified live: second device submitting the same word got the 409+id.
4. **status enum, committed with this log entry** (`20260716120300`): `community_puzzle_status AS ENUM ('pending','approved')` on all four community tables — enum over CHECK so the value union survives into the generated types (ADR 0017 gap closed; amendment recorded). `'rejected'` deliberately absent (reject = DELETE); divergence from nominations' `accepted` documented, not unified. Regenerated `database.types.ts` via MCP; the compiler found exactly one site — `createListHandler` fed a raw `?status=` string into `.eq()` — now validated. tsc back at the 24-error baseline.

**Important for the next deploy:** MCP `apply_migration` recorded invented versions (`202607161755xx`…), not the files' `202607161203xx` versions — the runbook handoff's repair step now lists **all five** versions and notes `db push --include-all` (the pending `20260715120100` sorts before recorded ones). Live-DB tests still silently skip without env injection (ticket 03) — this session ran them with `.env.local` vars injected into the shell; all green including the 7 new invariants.

## Session 91 — 2026-07-16: Full DB review (live schema × repo wiring) → 4 new handoffs, no code

**Goal:** review the whole DB setup — schema, RLS, migrations, route wiring — before moving on. Everything verified live via MCP (read-only SQL, advisors, `pg_policies`) against the repo. Handoffs-only per operator; nothing changed except handoff files + this log.

- **Worst finding: Stavrolekso creator edit silently no-ops in prod.** The PATCH edit route UPDATEs via the anon client, but live `pg_policies` grants `community_stavrolekso_puzzles` anon INSERT+SELECT only → RLS matches 0 rows, no error, route returns `ok:true`, edit discarded. Fix = service-role write after PIN check, never an anon UPDATE policy (RLS can't see the PIN). → `stavrolekso-edit-rls-noop-handoff.md`.
- **Deploy coupling:** main..dev = 13 commits incl. the ADR 0014 vrestifrasi flip; live vrestifrasi rows are old-shape (2/3/6), migration `20260715120100` correctly unapplied, `20260715120000` applied-but-unrecorded (needs `migration repair` before any `db push`). Ordered runbook → `deploy-dev-to-main-db-runbook-handoff.md`.
- **transfer_codes = device_uuid oracle:** anon ALL(true) lets the public key SELECT every active code + its device_uuid; claim is also check-then-set (race) and Math.random. → `transfer-codes-hardening-handoff.md`.
- **ADR 0013 contradiction:** player_achievements/player_pangrams/game_state are anon ALL(true) — "immutable" fact rows are anon-DELETEable table-wide; app paths need only SELECT/INSERT(+UPDATE for state). game_scores open-write stays (recorded decision). → `narrow-anon-rls-policies-handoff.md`.
- **No DB dedup backstops:** votes lack UNIQUE(nomination_id,device_id) (maybeSingle compounds dupes → toggle breaks), pending nominations lack the session-86-deferred partial unique index. Zero violations live today — applies cleanly. → `db-dedup-backstops-handoff.md`.
- **Enriched** the parked status-CHECK handoff with the live go/no-go (1 pending row total; nominations vocab confirmed).
- **Healthy, verified:** cron pruning works (state 2026-07-06.., codes 0 rows, accepted nominations all reviewed_at-stamped — first 30-day delete ~07-26); both July-15 indexes live; generated types match live schema; advisors == documented baseline, performance clean; postgres logs clean; no orphan votes; no non-ISO puzzle_dates (cron cutoff safe); identity wiring (profile token-scoped client, auth/link occupied-device guard) sound.
- Operator FYIs: 1 pending Leksindeseis community puzzle awaits review; typed-client work still uncommitted; `npm run db:backup` still broken (ticket 02); leaderboard top-20 rank ignores ties while playerRow rank shares them (cosmetic).

## Session 90 — 2026-07-16: The schema types get generated and wired into the compiler (ADR 0017)

**Goal:** resolve the parked typed-client handoff. Its own framing was that a ~200-line hand-written `Database` interface, which nothing type-checked against, had silently drifted from the real schema — regenerate it or delete it, but don't leave it.

**The blocker was obsolete, and re-testing it was the whole decision.** A comment claimed the `Database` generic "requires matching supabase-js internal GenericSchema exactly, which is brittle across minor versions." It had been justifying the `any` for months. On supabase-js **2.105.4 it did not reproduce** — `createClient<Database>` instantiates cleanly and writes compile with no cast. `QueryBuilder = any` is **deleted**, not narrowed.

**Two facts the handoff had wrong, both found by checking rather than trusting:**
1. Its Option B said to keep three types (`WordSuggestionInsert`/`WordSuggestionRow`/`NominationVoteInsert`) as hand-written standalones. They had **zero consumers** repo-wide — dead exports. Option B was "delete 215 lines and write nothing."
2. Its headline evidence was the community `status` typed `"accepted"` while code writes `"approved"`. **Generated types do not fix that** — `status` generates as `string`, because CHECK constraints don't survive into TS (only PG enums do; this DB has none). Verified by compiling `status: "utter_garbage"` — it passes. The old union wasn't stale so much as **aspirational**: it encoded a constraint the DB never had. Split to `.claude/handoffs/status-check-constraint-handoff.md`.

**Narrowed, not widened.** Every caller passed a literal, so params became the table-name union rather than taking a cast: `CommunityPuzzleGameConfig.table` → `CommunityPuzzleTable` (only the 4 community queues), `consumeApprovedPuzzle`/`upsertAndClean` → the union, and `auth/link`'s `db` shorthand → a generic `BoundTable` — that one line alone fixed **23 of that file's 23 errors**; they'd all cascaded from `name: string`. All new exports are **type-only**, so the 20 `vi.mock` factories needed no changes.

**The compiler immediately found a real mismatch:** `.eq("id", id)` was passing URL strings into `bigint` columns in three routes; PostgREST had been coercing them. Now `Number(id)` — two tests asserted the old string and were updated to say why.

**Q4 (drift guard) — decided C: none for now, and the reasoning is in the ADR so it isn't re-litigated.** I proposed a migration-parsing test on the premise it would "run free in CI." **False — vitest has never run in CI here**; `e2e.yml` runs only `npm ci` + `build` + Playwright. That killed A's only advantage. B (regenerate-and-diff vs the live DB) is the right guard, deferred to launch on two unmet prerequisites: `SUPABASE_DB_URL` in `.env.local` (genuinely absent) and a CI job that runs vitest (→ ticket 03). **No `npm run db:types` script** — verified `gen types` fails with `LegacyPlatformAuthRequiredError`, and a script that always throws is the same decorative artifact this ADR deletes. Regeneration goes through read-only MCP `generate_typescript_types`.

**The durable lesson (ADR 0017):** a type nothing enforces will rot — and what fixes that is wiring it into the compiler, not bolting a checker onto it. A generated file nothing checks against would rot identically.

**Also found, outside scope:** `npm run db:backup` currently throws (`scripts/backup-db.ps1` hard-requires the same missing `SUPABASE_DB_URL`).

## Session 89 — 2026-07-16: One route envelope (ADR 0016) + Leksiarxeio's fold gets tested

**Goal:** items 1 + 5 of the architecture review. `src/lib/apiRoute.ts` now owns what every route does before its own logic; the Leksiarxeio score fold comes out of the HTTP handler.

**The envelope** — `parseJson` (body + the 400 guard, ~10 hand-copied try/catch blocks), `requireAdmin` (the admin gate), and **two error channels sharing one body shape**. `{ error: string }` is unchanged on the wire; the meaning splits: `jsonError(code, detail?)` for envelope-owned codes (`invalid_json`/`unauthorized`/`not_found`/`db_error`) with `detail` logged and dropped, `jsonMessage(text, status?)` for copy the route authors. Migrated 14 route callers + `communityPuzzleLifecycle` (which had grown private `isAdmin`/parse copies — the seam wanted to exist one layer up).

**The review was wrong on two counts, both verified against the code:**
1. *"error bodies leak implementation"* — only some do. `/api/transfer/claim` returns **Greek player-facing copy** that `useProfile.ts:88` throws and the UI renders; the Leksindeseis/VresTinFrasi submit modals render `json.error` into the form. A blanket code vocabulary would have blanked the player's explanation. Hence the message channel — the split is the design, not a compromise.
2. *"24 routes each improvise"* — 9 community-puzzle routes already delegated to `communityPuzzleLifecycle`. Real count ~14, which the review's own leverage bullet admits.

**Deliberately not migrated:** `/api/cleanup-scores`. Cron-only behind `CRON_SECRET` — its PG messages go to Vercel, not a player. Diagnostic, not leak.

**Breaking change, taken on purpose:** `/api/nominations/[id]/review` moves the secret body → header and 403 → 401. Client + server ship together, no external consumers, so a compat shim would only have kept the second shape alive forever. `requireAdmin` tests assert the body-borne secret **no longer works**. `requireAdmin` also now denies everyone when `ADMIN_SECRET` is unset (the old `isAdmin` relied on an empty header failing the compare — right answer, by luck).

**Item 5 — `mergeLengthScore(existing, length, points)`** in `scoreMerge.ts` (same module as `planScoreMerge`; both are folds over `game_scores`). Absorbs the old one-line `aggregateLeksiarxeioScore`. The tests now cover the branches that could actually be wrong — no row yet, `data` null, a length posting twice, a lost (0-point) length, non-mutation — one line each, no faked request or DB. **Behaviour preserved, not improved:** a re-post overwrites rather than max-wins. Safe today (a length is played once/day, so a re-post is an identical replay, and overwrite is exactly idempotent); a test documents this so allowing replays-for-a-better-result fails there first.

**Two tests changed meaning rather than being fixed:** `gameScoresRoute` asserted `json.error === "DB exploded"` and `/Invalid JSON/i` — those described the defect, not a requirement.

## Session 88 — 2026-07-16: One `todayISO()` — "today's puzzle date" gets a module

**Goal:** ~12 re-derivations of "today" collapsed into one function. `todayISO()` now lives in `src/lib/puzzleDate.ts` beside `normalizePuzzleDate`/`resolvePuzzleDateParam`.

**Removed:** 4 byte-identical `getTodayDateString` copies (leksiarxeio/vrestifrasi/leksodromia/leksoplegma data loaders — now `export { todayISO as getTodayDateString }`, so callers and tests are untouched), 4 inline `.split("T")[0]` in leksokipos (`index.ts` ×3, `puzzleIndex.ts`), a local `getTodayString` in `leksindeseis/page.tsx`, 2 in `useDayChange`, 5 Board leaderboard props, `HomeTrophyButton`. Two idioms (`.slice(0,10)` vs `.split("T")[0]`) → one.

**UTC rollover preserved deliberately** (operator's call). `toISOString()` is UTC, so the daily puzzle rolls over at 02:00/03:00 Athens — Greek players between midnight and 3am get "yesterday". That is now a one-line change in one place instead of a 12-site sweep; tests pin the behaviour so a future switch to Europe/Athens is a deliberate red test, not an accident. If it's ever changed, think about already-persisted round state keyed by date.

**The architecture review was wrong on two counts** (both verified against the code):
1. *"Boards prefer the `today` prop they already receive"* — would have introduced a bug. The `today` prop is **not** today; it's the resolved puzzle date, set from `?puzzle=` via `resolvePuzzleDateParam`, so it can be any past date. The modal's `today` anchors the 7-day strip and the "Σήμερα" pill; `defaultDate` is the selection. The Boards passing `today={todayISO()} defaultDate={today}` were already correct.
2. *`LeaderboardModal.tsx:60` is a call site* — it isn't. That line is inside `getLast7Dates`, doing arithmetic on a caller-passed `today`. Left alone.

**Real bug found behind the review's "intra-module drift" flag** (right smell, wrong direction): `LeksodromiaBoard`'s **playing** branch passed `today={today}` (the puzzle date) with no `defaultDate`. Opening the leaderboard mid-game on a past puzzle anchored the strip on that date and labelled it "Σήμερα". Now matches the finished branch.

**Review missed** `useDayChange.ts` (2 sites) — the one place the rollover rule has user-visible behaviour, since it's what redirects a stale tab off yesterday's puzzle. Swept.

**Out of scope:** `scripts/*.ts` (Node-side, not the platform clock), `api/cleanup-scores` (a retention cutoff, not today), test fixtures deriving their own dates.

## Session 87 — 2026-07-16: Premade-data re-sync registry (ADR 0015)

**Goal:** an accepted nomination should keep *every* dictionary-derived game correct, not just Leksokipos. Implemented the handoff in `.claude/handoffs/resync-registry-handoff.md`.

**Enabling move:** `apply-nominations.mjs` → `.ts` via `tsx`. The `.mjs` boundary was forcing the script to re-mirror game logic (`normalise`, `puzzleAcceptsWord` with a hardcoded `>= 4` instead of `LEKSOKIPOS.MIN_WORD_LENGTH`). Both mirrors deleted — adapters call the real predicates.

**Seam:** `scripts/lib/resync/` — a registry of per-game adapters over one contract (`load` / pure `resync` / `write`). Orchestrators own `words-el.json` (the source) and walk the registry for everything derived from it. Vres Tin Frasi deliberately omitted (phrases, not dictionary-derived).

**Gaps closed:** Leksoplegma `bonusWords` (10 boards affected on the current backlog) and Leksodromia `anagramAlternates`. Both were silently going stale on every nomination.

**Drift guard:** `src/test/shared/premadeDataConsistency.test.ts` checks committed data against the committed dictionary; tiered by cost (exhaustive for stale-removal, exact for Leksiarxeio/Leksodromia, deterministic sample for the expensive full re-derivations). Verified it actually fails on injected drift. Committed data is currently clean — no backfill needed.

**Handoff was wrong on four counts** (all verified, not trusted):
1. The env-flag risk it said to resolve first was a non-issue — `tsx` forwards `--env-file-if-exists`.
2. The Leksokipos "predicate in `@/games/leksokipos/lib`" it said to import **does not exist**. Chose to call `computeValidWords(c, o, [word])` per word rather than extract one, keeping a perf-contracted hot path untouched.
3. `apply-proposed-words.mjs` is a **second consumer** of the re-sync with the same mirrors and the same staleness bug — unmentioned. Converted it too; the seam now has two real consumers.
4. Leksodromia `anagramAlternates` is **not** enumerated against `words-el.json` — keys come from curated `answers-{N}.json`, values from `words-{N}.json`. Derived *transitively*. Implemented a real delta, not the planned warning-only v1.

**Traps worth remembering:**
- `package.json` has no `"type": "module"` → `tsx` compiles scripts as **CJS**: use the plain `__dirname`, no top-level `await`. Lint, build and 1600+ tests all passed while the converted script was completely broken — **only running it caught this**.
- `words-el.json` has 3 non-normalised entries (`παλμος`, `πολεμας`, `σαλος`, final sigma ς) whose normalised forms are also present → 3 redundant duplicates. Harmless at runtime (lookups normalise) but any raw string comparison against it is a false-positive trap.

**Findings for the operator (current backlog):**
- `ιουνιοσ` is a curated Leksodromia answer that an accepted nomination removes from the dictionary → the game would keep posing a non-word. Re-curate `answers-7.json`.
- `σταυλου` is nominated twice. The old dry-run double-counted it; membership is now tracked in a Set so the preview matches the real run.

## Session 86 — 2026-07-16: Leksikastirio nomination guards (dedup normalization + name blocklist)
Two guarantees for word reports/proposals.
- **Duplicate hole fixed.** POST `/api/nominations` and `/api/nominations/lookup` normalized words with only `.toLowerCase().trim()`, while the platform stores accent-stripped/final-sigma-collapsed forms — so "καλός"/"καλος"/"καλοσ" were treated as distinct, letting duplicate pending nominations slip past the "vote for the existing one" flow (no DB unique constraint as backstop). Both routes + `NominationModal` now use `normalizeLetters` consistently (client `key` + `runLookup` targets + submit body), so variants collapse to one lookup key and the existing pending→upvote flow actually catches them. Stored nomination words are now normalized (matches dictionary storage; admins already see that form).
- **Name blocklist (req: "we don't accept names").** New `src/data/nominations-blocklist.json` (16,947 entries) = the ~16.9k proper nouns/foreign words curated OUT of the dictionary (recovered by diffing `d4e1824→605a102` word lists) ∪ all 12 month forms (nominative+genitive). Dual-use common words (νίκη/ελπίδα/σοφία/αγάπη…) were deliberately kept in the dict and are NOT in the set → very low false-positive rate. New `src/lib/nominationBlocklist.ts` (`isBlockedWord`, module-scoped Set, ~60 KB gzipped — fine for edge). ADD-direction proposals for a blocked word → POST returns **422 `blocked_word`** (authoritative); lookup returns `blocked:true` (short-circuits DB); modal shows a 🚫 "Δεν δεχόμαστε κύρια ονόματα" banner + disables submit. Removal reports are unaffected (block is add-only).
- Tests: new `nominationBlocklist.test.ts`; extended route + modal tests (422, blocked lookup, blocked banner, unblurred-submit guard, remove-allowed); fixed normalization expectations (καλος→καλοσ); registered the JSON in `deploymentReadiness.test.ts`.
- **Burst-duplicate bug diagnosed + fixed (ΑΓΟΡΑΡΟΣ report).** Operator saw ΑΓΟΡΑΡΟΣ 5–6× and rejecting felt broken. DB shows **6 byte-identical `αγοραροσ` rows, same device, 32 ms span, all already `status='rejected'`** — *not* accent variants (operator's hypothesis) and the rejections *did* persist; nothing pending remains. Root cause: `handleSubmit` `await`s `runLookup` **before** `setStatus("submitting")`, so the button stays enabled across a held-Enter key-repeat and every handler in the burst clears the dup checks and POSTs. Fix (**Option B**, operator's call): synchronous `busyRef` re-entrancy lock guarding submit **and** upvote (state can't do this — it disables only on the next render), reset on close so a hung request can't wedge the button. Red-test verified: lock disabled → 6 POSTs (reproduces the incident exactly); lock on → 1.
- Only 3 burst-dupe groups exist table-wide ever (`αγοραροσ`×6/32 ms, `σπατα`×2/9 s, `σταυλου`×2/3 s); zero duplicate **pending** rows now. Rejected/dupe rows left in place (retained-as-history by design, per operator).
- **Deferred — Option A backstop:** partial unique index `(word, direction) WHERE status='pending'` + POST 23505-conflict handling. It's the only thing that stops dupes from *two devices/tabs*; applies cleanly today (no pending dupes). Declined for now to avoid a prod schema change.
- Deferred: no dictionary-membership check for add (795k/20 MB list can't bundle into edge — pending-duplicate + blocklist cover the realistic cases). List is admin-editable JSON; not expanded further per user.
- Gates: **build 0 · eslint 0 · tests all green (0 fail).** No schema change, no deploy performed.

---

## Session 85 — 2026-07-15: DB schema review follow-ups (Task A index + Vres flip + first-place count)
Implemented the session-83 handoff after a `/grill-with-docs` design pass (handoff then deleted). Three atomic tickets.
- **Ticket 0 — `game_scores` read indexes** (`migration 20260715120000`): `game_scores_game_date_score_idx (game_id, puzzle_date, score)` for the leaderboard top-20/rank + the new daily-MAX aggregate; `game_scores_device_id_idx (device_id)` for lifetime stats + Sign-in Restore. **APPLIED to prod 2026-07-15 + verified** (both indexes present via `pg_indexes`). Applied via MCP `execute_sql` (`apply_migration` was 502-ing; `execute_sql` write path worked) — so migration-history did NOT record version `20260715120000`; a future `db push` needs `supabase migration repair --status applied 20260715120000` (see `/project-mcp` skill, updated this session).
- **Ticket 1 — Vres Tin Frasi → higher-is-better (ADR 0014).** Board now posts `scoreVresTinFrasi` points (6→1 win, 0 loss — already existed, was computed-but-unposted) instead of the raw attempt count; dropped the lone `sort=asc` in `GameLeaderboardModal` (labels → "Σκορ / υψηλότερο = καλύτερο"). Data migration `20260715120100` rewrites live rows (`7-score` for 1..6, `0` for 7). CONTEXT.md "Attempt Count" retired → points concept; new **ADR 0014** "every leaderboard is higher-is-better, no lower-is-better boards" (closes the per-game-direction problem for placement). **Data migration written, NOT yet applied.**
- **Ticket 2 — Leksokipos first-place count (Πρωτιές).** New pure `countFirstPlaceFinishes(rows, deviceId)` (`src/lib/placement.ts`, data-class 2 derivation — ties share rank 1); `/api/profile/stats` gained a cross-device Leksokipos fetch + `leksokipos_first_place_count` field (index-backed; documented >10k Fluid-CPU escape hatch → RPC/view); 5th stat cell in `LifetimeStatsStrip`. New CONTEXT terms First-Place Finish / First-Place Count. **No schema change — ships without a DB push.**
- **Parked** (per grill): Task C per-game max-score stat (until a Profile UI row exists); tiered `leksokipos-first-place-*` badges (frozen ids TBD); `player_placements` table (only if a live in-game "first!" badge is wanted).
- Gates: **build 0 · eslint 0 · tests all green (0 fail).** ⚠️ Two migrations await a prod `db push` (shared dev/prod DB — every write is production).

---

## Session 84 — 2026-07-15: Leksokipos soft cap (variable genius bar)
Replaced the flat `MAX_SCORE_CAP: 600` hard clip on `maxScore` with a logarithmic **soft cap** so the top-rank (Απολυτότητα) bar tracks each puzzle's richness instead of pinning ~57% of days to a genius target of 480. Motivation: a player noticed the max-rank score was identical every day.
- **Curve** (`softCap` in `games/leksokipos/lib/scoring.ts`): identity ≤ knee, then `knee + k·ln(1+(x−knee)/k)` above it — slope-1 continuous (no kink), strictly increasing, no hard ceiling. Operates on the 85%-scaled total (SCORE_SCALE unchanged).
- **Knobs** in `LEKSOKIPOS` (gameRules.ts): `SOFT_CAP_KNEE: 400`, `SOFT_CAP_K: 250` — chosen by simulating all 1008 real puzzles. Result: genius target median ~474 (≈ today's 480) but now spreads ~460–685 for normal-rich days, monsters compress to ~750–986 (was: everything ≥600-raw pinned to 480). Days below the knee are byte-identical to before.
- `MAX_SCORE_CAP` export removed (hard cap is gone as a concept). Tests: `gameLogic.test.ts` old "never exceeds 600" case → compression + strictly-increasing `softCap` cases. Docs updated (README stale "500" fixed; CONTEXT.md Max Score glossary). Gates: **test 1608 pass / 6 skip · eslint 0 · build 0** (1008-path SSG intact).

---

## Session 83 — 2026-07-15: DB schema review → handoff (no product code)
Full review of the player-data schema (`game_scores`/`game_state`/`player_pangrams`/`player_achievements`/`player_profiles`) against the user's four concerns; ADRs 0012/0013 answered three of them, verified live via MCP (read-only SQL).
- **Cron concern moot, verified in prod:** oldest `game_scores.puzzle_date` 2026-06-27 (>10d ⇒ append-forever fix live); oldest `game_state` 2026-07-05 (cron running). Snapshot: 204 score rows / 35 devices / 136 kB; profiles 38, achievements 70, pangrams 187.
- **Re-affirmed (not re-litigated):** growth accepted (row-per-game/device/day; rollup escape hatch later, not now); fact tables stay off `player_profiles` (RLS + clobber, ADR 0013); no incremented `total_score` (live-posting/retries/Restore-merge all break it) — derive from `game_scores`.
- **Real findings:** `game_scores` missing read indexes — leaderboard `(game_id,puzzle_date,score)` + per-device `(device_id)` (UNIQUE covers only `game_id` prefix); "times finished first" unbuilt (ADR 0013 lane B, derivable retroactively).
- **Handoff written** → `.claude/aiHelper/handoff/HANDOFF-db-schema-review-followups.md` (Task A index migration ready-to-implement; Task B placement design decisions; Task C optional per-game max-score stat). No code/schema changed; gates untouched.

---

## Session 82 — 2026-07-15: One Daily-Answer seam for the cross-game leak guard (arch-review #4)
Implemented item #4 of `architecture-review-2026-07-15.html` (final arch-review item taken; #5–8 left un-done, review HTML deleted after). The invariant "a derived game never surfaces Leksiarxeio's same-day fallback answer" was enforced twice in two shapes, both re-deriving `pool[dateToIndex(date, pool.length)]` and both copying the Fluid-safe answers-{4..8} direct-import block. Pure restructure, behaviour-preserving.
- **New Leksiarxeio-owned deep module** `src/data/leksiarxeio/answerPools.ts`: imports ONLY answers-*.json (never words-*.json / the index barrel → Fluid-safe), exports `LEKSIARXEIO_ANSWER_POOLS` + `getSameDayFallbackAnswers(date): ReadonlySet<string>`. Indexing math + pool layout become implementation.
- **Leksodromia**: `selectDailyWords` pure lib now takes `forbiddenAnswers: ReadonlySet<string>` (dropped its `dateToIndex` import + inline `forbidden` index derivation; skip is now `forbiddenAnswers.has(pool[idx])`). Loader (`data/leksodromia/index.ts`) deleted its 5-file import block + `ANSWER_POOLS`, now sources pools + forbidden set from the seam. Behaviour identical (forbidding the word == forbidding its index, since a length-L answer only appears in pool L).
- **Leksoplegma**: `containsSameDayLeksiarxeioAnswer` now iterates `getSameDayFallbackAnswers(date)`; loader deleted its 5-file block + `LEKSIARXEIO_POOLS` (kept `dateToIndex` — still used for the rotation base). Signature unchanged → its dataLoader test needed no edits (its own re-derivation stays as an independent oracle).
- Tests: new `answerPools.test.ts` (seam == pool[dateToIndex] all year, 5-member set); moved the end-to-end 365-day leak assertion to `leksodromia/dataLoader.test.ts` (its new home now the selector no longer self-derives); `selectDailyWords.test.ts` threads a local `forbiddenFor` oracle as the 3rd arg. Gates: **test 1600 pass / 6 skip · eslint 0 · build 0** (1008-path SSG intact).

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 81 | 2026-07-15 | **One GameLeaderboardModal + config** (arch-review #3): 6 per-game leaderboard wrappers deleted → shared `GameLeaderboardModal` + `GAME_LEADERBOARD_CONFIG` (`LeaderboardGameId` = 6 leaderboard games); 8 call sites migrated, `HomeTrophyButton` six-way branch collapsed; type trap: annotate map `Record<LeaderboardGameId,…>`, not `satisfies` (union loses optional fields). Pure restructure. 1596 pass. |
| 80 | 2026-07-15 | **Session spine owns score-posting** (arch-review #2): both round hooks split dispatch into `rawDispatch` (RESTORE only) + wrapped dispatch that flips `hasLiveActedRef`; expose `hasLiveActed()`. New shared `useLiveScorePost.ts` (post-on-change / restored-guard / finish-once-open) — both Boards deleted `userActedRef`+`finishedHandledRef`+effect + 5 `userActedRef=true` lines. Pure restructure. 1596 pass. |
| 79 | 2026-07-15 | **`usePlayerIdentity`** deep module (arch-review #1): one hook bundles `migrateLeksiarxeioIdentity` (run before id read) + useGameIdentity/useProfile/useAuth + `saveName`; returns `leaderboardProps` (12-prop bundle). Adopted at 6 side-effect-free call sites; Leksokipos+Leksindeseis keep hand-assembly (score-re-post interleave). 1587 pass. |
| 78 | 2026-07-14 | Λεξόπλεγμα extras reinstated + soft collapse (prod grill): bonus words count again (+25, `computeScore(required,bonus,hints)`); soft collapse (dim, still interactive, no grab-race); auto-submit required-only + ✓ for extras; **Leksodromia Second Chance** (first «Επόμενο» requeues w/ resumed clock+hints, second is final); greeklish UI renames; continuous score posting both games; CONTEXT fully glossed. 1596 pass. |
| 77 | 2026-07-14 | Λεξόπλεγμα/Λεξοδρομία QA polish: counter bug (traces undirected → accept either direction); bonus "time element" cut (reinstated s78); tap-answer-row to remove letter; two-row rack; Παράλειψη→Επόμενο; **both graduated wip:false → 7 live games**. |
| 76 | 2026-07-14 | Fluid CPU prerender read-out — **VERDICT FIXED ✅**: `[center]/[outer]` 44→~1 inv/60s, ≈0.6 min/day vs 10 baseline; daily combo CDN-HIT+prerender. Vercel Pro upgrade (gauge in $). No product code; `/project-mcp` CLI section added. |
| 75 | 2026-07-14 | **Λεξόπλεγμα built** (`/tdd`, 7 slices): pure `graph.ts`/`scoring.ts` lib, single `TRACE_WORD` reducer seam (drag+tap), offline generator core in lib (batch 200 puzzles/193 KB), loader w/ same-day-Leksiarxeio-answer guard (direct answers-{4..8} imports, Fluid-safe), hook, SVG live-edge components. registry wip:true. 1560 pass. |
| 74 | 2026-07-13 | **Λεξοδρομία built** (`/tdd`, 7 slices): decay-to-floor scoring + seeded daily selection (never Leksiarxeio's same-day answer) + seeded scramble; tile-index reducer w/ hint prefix-locking; refresh-proof decay clock (`useElapsedClock`, 1 s-coarsened persist); Board/PageClient/recap/leaderboard; direct `answers-{4..8}` imports (Fluid-safe); registry `wip: true`, accent red-600. 1487 pass. |
| 73 | 2026-07-13 | **Leksoplegma design grill → handoff** (built in session 75): reverse-engineered zanagrams.com from source (16-tile graph, authored paths, bonus words, collapse rule); decisions: offline generator batch + rotation, no timer/points-only, ~9 required words, name FINAL leksoplegma. |
| 72 | 2026-07-13 | **Anagram-sprint design grill → handoff** (became Λεξοδρομία, built in session 74): decay-to-floor scoring, 2× lengths 4–8 from Leksiarxeio answer pools, exact-match MVP, refresh-proof clock, leaderboard at launch (`game_scores.game_id` unconstrained — no migration). Name-first blocker recorded. |
| 71 | 2026-07-10 | **Prerender daily combos** (Fluid #2): `getPrebuiltPuzzleParams` (slim index, canonical-param contract) + `generateStaticParams` on `[center]/[outer]` → route `ƒ`→`●`, 1008 pages SSG, custom combos keep ISR 604800. Deleted done+superseded fluid handoffs (**payload item 1 + consume-per-view bug 2 still unimplemented**; verdicts in `fluid-cpu/analysis.md`). New `fluid-cpu/HANDOFF-post-deploy-readout.md` (~1 wk post-merge; fill merge commit at merge). **Manual browser play-through required before dev→main merge.** 1413 pass. |
| 70 | 2026-07-08 | Fluid CPU read-out (gauge ≈10 min/day, `[center]/[outer]` 1.4 s/inv dominant) + **lazy-load words-el**: `buildCustomPuzzle` async `await import()` on cache-miss only, static import removed, Fluid CPU source-guard in `deploymentReadiness.test.ts`; words-el its own 19.9 MB async chunk. Prerender lever handed off. 1407 pass. |
| 69 | 2026-07-07 | **Achievements B2 — pangram tier** (`/tdd`): `player_pangrams` append-only find-SET (ADR 0013 data-class 3; migration `20260706120000`, **`db push` was PENDING**); `POST /api/pangrams` insert-if-absent + shape guards (`sanitizePangramWords`); `detectEarnedPangramTiers` (generic tier core); 3rd `useAchievementSync` lane + self-heal on the ONE stats fetch; `pangram_count` on `/api/profile/stats`; `planPangramMerge` in restore; TrophyCase generalized; cleanup-scores regression-locked. Manual prod verification was pending. 1403 pass. |
| 68 | 2026-07-06 | B2 pangram-tier handoff code-verification review: all claims accurate; fixed R6 contradiction (per-word delta-posting, not per-session), scoped risk #8 honestly (self-heal ≠ cross-day), added R2 input guards (`isISODate`+normalize+shape regex+cap), self-heal rides the ONE `/api/profile/stats` fetch. No product code. |
| 66 | 2026-07-06 | **Achievements B1** (`/tdd`): points tier (Συλλέκτης Πόντων) + unlock toast + TrophyCase progress on the *safe* badge (no migration/merge). `leksokipos_points` on `aggregateLifetimeStats`; `useAchievementSync` points+toast lanes (earned-at-mount suppression); `AchievementToast`; ADR 0013 "B1 resolutions". 1354 pass. |
| 65 | 2026-07-05 | Fixed `game_scores` prune contradicting ADR 0012 append-forever (issue 03): cron never deletes `game_scores`; `SCORE_RETENTION_DAYS`→`SESSION_RETENTION_DAYS`; stats query window-filter regression-locked. Issue 03 deleted. 1291 pass. |
| 64 | 2026-07-05 | Fluid CPU: `/leksokipos` puzzle-index (route chunk 22MB→0.2MB) + `[center]/[outer]` ISR 3600→604800; measured Leksiarxeio/Frasi 2.4MB/view; `consumeApprovedPuzzle`-per-view bug + payload items 1+2 handed off. 1274 pass. |
| 63 | 2026-07-04 | **Feedback feature** (grill→/tdd): form-to-email relay (no dep/table/bucket), text-only MVP on **FormSubmit AJAX** (`formsubmit.co/ajax/<id>`); `FeedbackModal` (shared `Modal`, ≤1000, auto-attach page/UA/device, 60s throttle) via Shell "Βοήθεια"; `btnModalPrimary` recipe extracted; env `NEXT_PUBLIC_FORMSUBMIT_ID`. New CONTEXT glossary term **Feedback**. Screenshot parked. 1251 pass. |
| 62 | 2026-07-03 | **Consolidation-file consistency**: enforced config sources (`LEKSOKIPOS.MIN_WORD_LENGTH`, `LEKSIARXEIO.LENGTHS`; `LeksiarxeioLength` 3→dead removed); `GameId`→`SliceId` rename (persistence-slice union, not registry); ADR 0008 palette sweep + new `noRawPaletteClasses.test.ts` guard (allowlist = documented exceptions). 1236 pass. |
| 61 | 2026-07-03 | **Epic B — Profile Page + Trophy Case COMPLETE** (`/tdd`, 7 commits `e6b0daa`→`973ab31`): `/profile` route (`IdentityHeader`+`WelcomeBackBanner`+`ProfileSection`); 3 entry points (Shell 👤, home `ProfileChip` island, funnel link); `GET /api/profile/stats` + pure `aggregateLifetimeStats` + `LifetimeStatsStrip`; page-local `TrophyCase` (catalog in `achievements.ts`, all locked). Τζιμάνι = leksokipos-only. 1233 pass. |
| 60 | 2026-07-03 | **Epic A COMPLETE** (migration pushed+verified, handoff deleted). Grill moved `identity_audit` to link-time (change-only rows, service-role, no FK to auth.users); hard `reloadApp()` on Disconnect (stale in-memory board state). Migration `20260703092500`. 1208 pass. |
| 59 | 2026-07-03 | Epic A slices 3+4: Disconnect unification (`disconnectIdentity()` full-reset — deviceId+name+flags+all game slices); visibility rule (`onSignIn` required, Google sign-in in ProfileLinked mode, wired into all 4 boards). Identity/achievements grill: device_uuid key, no-backfill, per-tier rows. 1198 pass. |
| 58 | 2026-07-03 | Profile Page grill → handoff ready-for-agent, zero code. Decisions table, catalog draft (§4), restore→/profile redirect. CONTEXT glossary: Profile Page/Trophy Case/Badge/Lifetime Stats. |
| 57 | 2026-07-02 | Sign-in Restore impl slices 1–2: JWT is identity source (401 guards, shared `getServiceRoleClient`); restore/merge via pure `planScoreMerge` (best score per puzzle); `adoptDeviceIdentity`. Fixed silent `device_uuid`→`device_id` backfill bug. 1194 pass. |
| 56 | 2026-07-02 | Sign-in Restore design grill → **ADR 0012** (auth = durable anchor, restore adopts DeviceId, Disconnect resets); ADR 0007 superseded-in-part; CONTEXT glossary + `docs/admin-restore.md` break-glass recipe. |
| 55 | 2026-07-02 | Test-suite audit: gap-fill + dup cleanup; soul.md rule "coverage never goes down"; consolidated gameLogic/greekLogic + mobileLayout; new vrestifrasi/useProfile/useLeaderboardProfile suites. 1174 pass. |
| 54 | 2026-07-02 | Architecture: 4 pure community-puzzle `validateSubmission` adapters (routes → config); Stavrolekso PATCH edit-hole closed; maker/server dedup. 1158 pass. |
| 53 | 2026-06-29 | UI consolidation (**ADR 0009**): per-game `--game-accent` token; shared `Modal` primitive (9 modals); recipes split (platform vs leksokipos); dead `lightTrigger` deleted. 1104 pass. |
| 52 | 2026-06-29 | Bug fix: leaderboard "back to today" link used `date<today`; now `date!==defaultPuzzleId` + distinct today label. 1115 pass. |
| 51 | 2026-06-28 | Bug fix: past-puzzle nav (`useDayChange` mount-redirect early return; `key={puzzle.id}` remount; `shouldSave` guard for empty state). 1113 pass. |
| 50 | 2026-06-28 | Architecture: `consumeApprovedPuzzle` lifecycle; shared `useGuessRound` spine; Leksokipos `sync.ts` seam (push+pull); folded `dateToIndex`. 1109 pass. |
| 49 | 2026-06-27 | Leksokipos UI polish (6): `btnHeaderIcon` recipe, smaller variant toggle, dice removed, copy-icon share, Greek feedback msgs, two-phase GiveUpModal. 984 pass. |
| 48 | 2026-06-27 | Fixed broken score cleanup (`upsertAndClean` used `void` not `await` → thenable never fired). New `cleanup-scores` GET route (CRON_SECRET, service role, >7d) + daily `vercel.json` cron. **Needs `SUPABASE_SERVICE_ROLE_KEY`+`CRON_SECRET` in Vercel env.** |
| 47 | 2026-06-27 | Rank rename (ψαράκι→Απολυτότητα, `RANKS` single source) + full design-token consolidation (**ADR 0008** CSS semantic tokens; all games/shared tokenized, 0 `dark:` in leksokipos); `platform.ts`. 972 pass. |
| 46 | 2026-06-24/26 | Wordlist proper-noun cleanup: 16,933 removals from `words-el.json` (812k→795k) via Hunspell capitalisation signal; applied + puzzles re-synced. 949 pass. |
| 45 | 2026-06-22 | Leksikastirio admin `max-w-6xl`; nomination re-proposal warning (`/api/nominations/lookup` + blur-check; rejected→mandatory note, pending→info); apply-nominations skill refreshed; 4 tests. |
| 44 | 2026-06-22 | Nomination apply pipeline: `scripts/lib/resync-puzzles.mjs` surgical `puzzles-el.json` re-sync in `apply-nominations.mjs`; `npm run apply-nominations[:dry]`; 13 tests. |
| 43 | 2026-06-22 | NYT brand scrub (comments/docs only; IDs frozen); pinch-zoom lock (`viewport` in `layout.tsx`); Leksokipos `useDayChange` auto-advance on stale-CDN day change. 932 pass. |
| 42 | 2026-05-30 | Google OAuth augments device identity: `useAuth`, `/auth/callback` PKCE, `/api/auth/link` edge route (upserts `auth_user_id`, back-fills), `authLinked` in envelope, `ProfileSection`+4 modals threaded, ADR 0007. |
| 41 | 2026-05-29 | Bug fixes: dark-mode FOUC on Leksokipos client nav; Stavrolekso server crash (self-`fetch`→direct Supabase); Turbopack edge warning documented. |
| 40 | 2026-05-28 | Vres Tin Frasi — 4th game: pure logic, community-first data loader, components, `/vres-tin-frasi`, platform wiring, Leksikastirio "Φράσεις" tab, tests. |
| 39 | 2026-05-28 | Bug fixes + Leksokipos game-state restore: word normalisation; scoreboard labels; FOUC script; `useGameStateSync` slimmed to `{foundWords}`; server-restore gating; ADR 0003. |
| 38 | 2026-05-27 | Community puzzles: review routes, async data loaders (community-first FIFO), submission modals, admin tabs in Leksikastirio. |
| 37 | 2026-05-27 | Dark mode: `@custom-variant dark`, `useTheme`, ☀️/🌙 toggle, dark variants across games/modals, ADR 0002. |
| 36 | 2026-05-27 | UI polish: compact ✓/✕ admin buttons; Greeklish "Leksikastirio"; Shell header + Παιχνίδια/Κοινότητα drawer split; Leksiarxeio white mode. |
| 35 | 2026-05-26 | Architecture: `useGameIdentity` (SSR-safe id init); `useScoreSubmission` extended to all games; per-game submission hooks deleted. |
| 34 | 2026-05-24 | FlowerGrid variant presets; `LeksokiposLayout` toggle persisted to `leksokipos-variant`; tests. |
| 33 | 2026-05-23 | Internal identifier rebranding to Greek names (hooks/components/types). Puzzle ID strings unchanged (localStorage compat). |
| 32 | 2026-05-23 | `FlowerGrid.tsx` — SVG flower grid; replaced `HoneycombGrid`. |
| 31 | 2026-05-22 | Platform rebrand: Spelling Bee→Leksokipos, Wordle GR→Leksiarxeio, Connections→Leksindeseis; Greek rank names; routes/components renamed. |
| 30 | 2026-05-22 | Connections leaderboard: `POST/GET /api/connections-scores`, hook, modal, board extracted. |
| 29 | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; submission hook refactor. |
| 28 | 2026-05-22 | `useRoundPersistence` replaces 3 per-game persistence patterns. |
| 27 | 2026-05-22 | `CONTEXT.md` created; `Puzzle`→`SpellingBeePuzzle`; `getPrebuiltPuzzleByLetters`. |
| 26 | 2026-05-21 | `flex-1 aspect-square` tiles + per-length `max-w-*`; `WordleHeader` extracted; 🏆 in header. |
| 25 | 2026-05-21 | Vercel Fluid CPU mitigations: `validWordsCache`, ISR `revalidate=3600`, Edge runtime on all API routes. |
| 24 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes. |
| 23 | 2026-05-20 | `useScoreSubmission` + submission hook; `useLeaderboard` `buildUrl` param. |
| 22 | 2026-05-20 | Spelling Bee Give-Up: confirm → locked game → missed words revealed; `givenUp` persisted. |
| 1–21 | 2026-05-12–19 | Foundation (shell, routing, persistence, types) · Leksiarxeio · Theming · Leksindeseis · Greeklish URLs · quality filter · suggestions · per-puzzle leaderboard + 7-day strip · mobile · no-accent invariant · `maxScore` cap. |
