# Handoff B2: Achievements — Pangram tier (new set-table + sign-in merge + cleanup exclusion)

**Date:** 2026-07-06 (split out of the old `achievementsEpicB-deferred.md`)
**Status:** 🟡 **BUILT (session 69, 2026-07-07) — code complete, gated (1403 pass · eslint 0 · build 0), UNCOMMITTED. Blocked on 3 human/prod steps below before it works live.** Everything under "## Grill resolutions" was implemented as specified; build slices matched the "Suggested build order" 1:1.

---

## ⚠️ Remaining tasks to finalize (session 69 → next) — DO THESE TO CLOSE B2

**All product code + tests + docs are done and green. What's left is production-touching and human-gated:**

1. **[AGENT+HUMAN — REQUIRED, BLOCKS EVERYTHING] `npx supabase db push`.** The migration file `supabase/migrations/20260706120000_add_player_pangrams.sql` exists but has **NOT** been pushed. Until it lands, `POST /api/pangrams` and the `pangram_count` query hit a non-existent table (500s) — the pangram tier is inert. ⚠️ **Shared dev+prod Supabase project** — this is a live production schema change (additive `CREATE TABLE`, low blast radius, but real). All tests mock Supabase, so none required the live table; that's why it was safe to defer. Run from repo root; `db push` needs no Docker.
2. **[HUMAN — verification] Manual smoke-check on prod, carefully.** Lanes are gated `!isGodMode`, so god mode can't exercise them — a real check writes **production** rows. Use a throwaway `device_uuid`: play a daily, find a pangram, confirm (a) a `player_pangrams` row appears, (b) `/api/profile/stats` returns `pangram_count`, (c) at 10 distinct the χάλκινο tier toasts + the TrophyCase chip lights. **Delete that device's `player_pangrams`/`player_achievements` rows afterwards** via Supabase MCP `execute_sql`. (Same caution as B1's still-pending manual check, session 66.)
3. **[HUMAN — decision] Commit.** The tree is uncommitted at session end (also carries prior uncommitted B1 work + unrelated edits per git status). Decide the commit boundary; on the default branch, branch first.

**Nice-to-have follow-ups (NOT blockers):**
- B1's own manual verification was also left pending (session 66) — the points-tier flow has never been exercised on real data either. Fold it into step 2's session if convenient.
- Balance pass on `pangramTierThresholds` (10/20/50) once real pangram-rate data exists — the Greek badge names are still placeholder/not-locked (R1), so a threshold or naming change is a tuning/query edit, **no migration**.

---

## Original handoff (for reference — everything below was BUILT as specified)

**Status (pre-build):** 🟢 Ready — **B1 shipped (session 66, 2026-07-06)**; its shared UX spine is live in code. **Grilled (session 67, 2026-07-06) — all open questions resolved. See "## Grill resolutions" at the bottom; those are the load-bearing decisions to build from. Re-verified against code + refined (session 68, 2026-07-06): every reuse-map claim confirmed live; R6 rewritten to delta-posting (a literal once-per-session post contradicted R3's "no lag"), risk #8 scoped honestly (day-rollover loss is real and accepted), input guards added to R2, single per-mount stats fetch mandated in R3/R6. Ready for `/tdd`.**
**Sequencing:** ✅ **B1 done** (`achievements-B1-points-tier-and-unlock-ux.md`, deleted on completion). It built the shared UX spine — unlock toast + Trophy Case tier-lighting + "X / N" progress — so this handoff just **feeds the pangram tier into the existing spine** (see the reuse map for the exact extension points). This handoff is the **DB-touching, merge-touching** half of the tiered badges, deliberately isolated so it can be reviewed on its own blast radius.

**Built on Epic A + ADR 0013.** Read `docs/adr/0013-achievements-immutable-earned-fact-rows.md` — especially **Lane C** (append-only set → size → crossing fact) and the retention/merge rules.

---

## Scope (this handoff only)

**The pangram tier** — `leksokipos-kynigos-pangram-{chalkino,asimenio,chryso}` (thresholds `10 / 20 / 50` distinct pangrams, already in `src/config/achievementTuning.ts → pangramTierThresholds`). Each tier is its own frozen `player_achievements` row, written the moment the distinct-pangram count first crosses its threshold.

**Progress = an append-only SET, never a counter (ADR 0013 Lane C).** The "X / 10" a player sees is the *size* of a set, computed, never a stored tally. A mutable `count = count + 1` re-introduces the exact clobber/double-count trap immutable facts avoid (a retry posts twice; a merge double-counts). Sets are retry- and merge-safe by construction.

## What this handoff must build (the heavy, risky parts)

1. **New table `player_pangrams`** — mirrors `player_achievements`: open RLS (anon insert like `game_state`), insert-if-absent, a `UNIQUE` constraint that makes re-inserting the same pangram a no-op. Count = `COUNT(*)`. **New migration in `supabase/migrations/` + `npx supabase db push`** (CLAUDE.md — never via dashboard/MCP alone). ⚠️ One shared Supabase project backs dev+prod — treat the migration as production.
2. **Its OWN sign-in merge** — `planAchievementMerge` covers `player_achievements` only. A new progress-set table needs its **own merge in `restore()`** (`/api/auth/link`), mirroring `planAchievementMerge` (repoint old-device rows onto the canonical identity, drop duplicates via the UNIQUE constraint). Two devices **union**; double-counting impossible by construction.
3. **Its OWN exclusion from the cleanup cron** — `/api/cleanup-scores` must **never** sweep `player_pangrams` (it's append-forever, same stance as `game_scores` / `player_achievements`). Add a regression test asserting the route never deletes it.
4. **Tier detection + write** — record pangrams live as they're found (delta-post per R6, not end-of-game); when the returned set size first crosses a threshold, POST the tier id to `/api/achievements` (`ALL_ACHIEVEMENT_IDS` already whitelists the pangram-tier ids — **no earn-endpoint change**).

## Reuse map (already built — do not rebuild)

- **UX spine from B1 (concrete artifacts — wire the pangram tier into these):**
  - **Unlock toast** — `AchievementToast` (`src/components/leksokipos/AchievementToast.tsx`) + the fixed stack in `GameBoard`. It's fed by `useAchievementSync`'s `onAchievementEarned(badge)` callback, which **already suppresses badges earned before this session** (it fetches the earned-at-mount set via `fetchEarnedAchievementIds`). The pangram lane just needs to surface freshly-crossed tier ids the same way — **add a third lane inside `useAchievementSync`** (it already owns the one-shot + points lanes) so its toasts inherit the suppression for free.
  - **Copy resolver** — `describeAchievement(id)` (`achievements.ts`) already maps **any** tier id → `{ name, tierLabel }`, so the pangram-tier toast + chips get their Greek copy with zero new code.
  - **Trophy Case lighting + progress** — `TrophyCase`'s `TierChips` already lights on `earned.has(tierId) || value >= threshold` and renders the `points-progress` "X / N" line. **Two extension points**, both currently points-specific: (a) `TrophyCase` passes a live `points` value **only for `SYLLEKTIS_PONTON_ID`** (the pangram tile gets `points={undefined}` → earned-fact-only) — extend it to also pass the live **pangram set size** for `leksokipos-kynigos-pangram`; (b) the progress denominator uses `nextPointsTierThreshold(points)` — **generalize it** (or add a pangram sibling) so the pangram tile shows its own next threshold.
- **Earn endpoint** `POST /api/achievements` — pangram-tier ids already whitelisted; writing a tier fact is a plain POST.
- **Merge precedent** — copy the shape of `planAchievementMerge` (`src/lib/achievementMerge.ts`) for the new set-table merge.
- **Tuning** — `pangramTierThresholds` already defined. Read it; don't hardcode.
- **`isPangram`** — pure detector already in `src/games/leksokipos/lib/` (used by scoring).

## ⚠️ Open design questions — ✅ RESOLVED in session 67 (see "## Grill resolutions" at bottom)

1. **UNIQUE-key semantics — the load-bearing one.** `(device_uuid, puzzle_date, word)` → the *same* pangram word on two different days counts **twice**; `(device_uuid, word)` → each pangram word counts **once ever**. "Distinct pangrams" is ambiguous and this choice redefines what the `10/20/50` thresholds mean. Decide deliberately.
2. **Detection round-trips.** Post-then-read the count, or have the pangram-POST endpoint **return the new count** so the client can check the crossing in one round-trip? Decide the wire shape (this also decides whether pangrams get their own route or piggyback an existing one).
3. **Progress "X / N" data source.** The TrophyCase **display** half is already built by B1 (feed a live number → chips light on `earned ‖ value≥threshold` + progress line). What's still open is the **data source**: which endpoint returns the live pangram set size (a `COUNT(*)` over the new table)? B1's precedent was to reuse `/api/profile/stats` and add a field — decide whether the pangram count rides that same read or gets its own. Note the **accept-one-game-lag** precedent from B1's points lane (detection reads the count back on mount; a just-earned pangram is caught next mount) — decide if the same lag is acceptable here.
4. **Offline-Lock / retry tolerance.** Confirm the insert-if-absent + UNIQUE design makes duplicate flushes from Offline Lock a genuine no-op (it should — same rule as scores).

## Constraints

- Pure logic in `src/games/leksokipos/lib/` — zero React imports; testable.
- DB change **only** via `supabase/migrations/` + `npx supabase db push`. New set-table mirrors `player_achievements`: open RLS, insert-if-absent, unioned on Restore, **never swept** by cleanup.
- Edge runtime for fetch-only routes; no per-word hotpath cost (soul.md). No new npm deps without approval.
- Post-feature protocol (soul.md): review → tests → perf check → consolidation check → all 3 gates → update `log.md`.

## Suggested skills
`/aihelper` (context) → **grill done (session 67 — see resolutions below)** → `/tdd` (build; also fold the ADR 0013 addendum + CONTEXT.md table row into that session).

---

## Grill resolutions (session 67, 2026-07-06)

Settled with the user. These are **recommendations to build from** — the user flagged feeling out of depth on the concurrency / double-truth angles and will implement in a later session, so the **Concurrency & double-truth risk register** below is the part to read carefully and verify during `/tdd`.

### R1 — UNIQUE key = `(device_uuid, puzzle_date, word)`, count = `COUNT(*)` ✅ LOCKED (user-confirmed)
- **Same pangram word on two different days/puzzles counts twice. We do NOT dedup by word.** The threshold reads `COUNT(*)`, not `COUNT(DISTINCT word)`.
- Rationale: terminology (the Greek badge names) is **placeholder / not locked**, so store the *richest* fact and let the count query define the meaning. `(device, puzzle_date, word)` keeps the day dimension, so a later pivot to "distinct words" is a query change, **no migration**. Within one puzzle the same word dedups (retry-safe); across days it re-counts (user's explicit call).
- Cross-device correctness falls out: same word, same day, two synced devices → both rows are `(canonical, date, word)` after merge → UNIQUE collapses to **one** find (correct — one hunt, not two).

### R2 — New table + own route. New `player_pangrams` table; `POST /api/pangrams` returns the fresh count
- `player_pangrams(id, device_uuid text, puzzle_date date, word text, found_at timestamptz default now())`, `UNIQUE(device_uuid, puzzle_date, word)`. **Mirror `player_achievements` exactly** for RLS/grants (open `anon access`, `USING(true) WITH CHECK(true)`) — see `supabase/migrations/20260706093000_add_player_achievements.sql`. New migration `…_add_player_pangrams.sql` + `npx supabase db push`. ⚠️ shared dev+prod project — treat as production.
- `POST /api/pangrams {device_uuid, puzzle_date, words[]}` → insert-if-absent (upsert `ignoreDuplicates:true`, `onConflict:"device_uuid,puzzle_date,word"`) → **return `{ count }` = `COUNT(*)` for the device** (`select` with `count:"exact", head:true`). Edge runtime. It does NOT tier-detect (server runs zero detection, ADR 0013 §2) — it returns the count and the client decides crossings.
- **Input guards (session-68 addition — append-forever table + open RLS means junk is permanent).** Unlike `/api/achievements`, there is no id whitelist possible here, so bound the shape instead: reject non-ISO `puzzle_date` (reuse the existing `isISODate` single-source); run each word through `normalizeLetters` before insert (belt-and-suspenders — `foundWords` are already normalized at `SUBMIT_WORD`, but the `UNIQUE` **text** key must never see two casings/accent-forms of the same find or the count inflates); drop words that can't be pangrams (post-normalize `/^[α-ω]{7,24}$/` — a pangram contains all 7 letters so length ≥ 7); cap `words[]` (e.g. 50/request). Same trust model as scores — these bound junk, they don't authenticate.
- Piggybacking `/api/achievements` (keyed `device_uuid`+`achievement_id`) or `/api/game-state` was rejected — neither fits the `(device, puzzle_date, word)` shape.

### R3 — Detection = immediate same-session crossing + mount-time self-heal (NO one-game lag)
- Unlike the points lane, pangrams have **no lag**: the `POST /api/pangrams` *just inserted* today's pangrams, so its returned `count` is authoritative and current. Detect the crossing from that returned count in the same round-trip and `POST /api/achievements` the crossed tier ids (pure `detectEarnedPangramTiers(count)`, mirror of `detectEarnedPointsTiers`; ids already whitelisted in `ALL_ACHIEVEMENT_IDS`).
- **Self-heal lane** (belt-and-suspenders, like the Τζιμάνι glyph): on game-screen mount, read `pangram_count` back and post every crossed tier (insert-if-absent makes "already earned" a no-op — no need to know the earned set, mirror the points lane exactly). Covers the crash/offline gap between the pangram write and the tier POST.
- **Zero extra requests (session-68 addition):** the self-heal read must ride the **same per-mount `/api/profile/stats` fetch the points lane already makes** — extend `fetchLeksokiposPoints` (`sync.ts`) into a `fetchLifetimeStats` returning `{ leksokipos_points, pangram_count }` and feed both lanes from the one response. Do NOT add a second stats round-trip per mount.

### R4 — Progress "X/N" + self-heal read source = `pangram_count` on `/api/profile/stats`
- **The stats surface already exists** — `src/app/profile/page.tsx` + `LifetimeStatsStrip.tsx` + `TrophyCase.tsx` + `/api/profile/stats`. **No separate stats-page handoff needed** (the user's assumption that it wasn't built is stale; B1 already threaded `leksokipos_points` through this exact surface).
- Add `pangram_count` to `/api/profile/stats`: a parallel `COUNT(*)` over `player_pangrams` (via `Promise.all`) alongside the existing `game_scores` aggregate. One field serves **both** the TrophyCase "X / N" display **and** the R3 self-heal read. **No separate `GET /api/pangrams`.**
- TrophyCase generalization (B1 left these points-specific): pass a live pangram count for the `leksokipos-kynigos-pangram` tile (currently `points={undefined}`), and give the progress denominator a pangram sibling to `nextPointsTierThreshold` (e.g. `nextPangramTierThreshold(count)`). Chips light on `earned.has(tierId) || pangram_count >= threshold`.

### R5 — Restore merge = new pure `planPangramMerge`, keyed on `(puzzle_date, word)`
- `planAchievementMerge` dedups on `achievement_id`; pangrams dedup on the composite `(puzzle_date, word)`. Write a **new pure `planPangramMerge(oldRows, canonicalRows)`** mirroring the achievement one: repoint old-device rows onto canonical, drop the ones canonical already holds (the UNIQUE would reject them). Wire it into `restore()` in `/api/auth/link` right next to the existing achievement merge block (lines ~224–237).
- **Double-count on merge is impossible by construction** — progress is a SET of rows, not a counter; union + UNIQUE dedup is the whole point of ADR 0013 Lane C.

### R6 — Write trigger = a 3rd lane in `useAchievementSync`; `GameBoard` computes the pangrams
- Add a third lane to `useAchievementSync` (it already owns the one-shot + points lanes and their toast suppression — the pangram toast inherits suppression for free). `GameBoard` computes `foundPangrams = foundWords.filter(w => isPangram(w, puzzle))` (it holds the `puzzle`; keeps the hook React-thin and the lib pure) and passes `foundPangrams` + `puzzleDate` into the hook.
- **Delta-post, not once-per-session (session-68 correction — the original "post once per session" contradicted R3's "no lag"):** the lane re-runs on every `foundWords` change (like the one-shot lane) and posts only the pangram **words** not yet posted this session (a per-word `postedWordsRef` set, not a single boolean). Each response's fresh `count` feeds `detectEarnedPangramTiers` — that is what makes the mid-session crossing immediate; a literal once-per-session post would lag every pangram found after the first flush to the next mount. Gated `isDaily && !isGodMode && deviceId` like the other lanes.
- ⚠️ **Referential-stability trap:** `GameBoard` must `useMemo` `foundPangrams` on `[foundWords, activePuzzle]` — a bare `.filter()` mints a new array every render; as an effect dep it re-fires the lane on every render (harmless-but-wasteful with the ref guard, but don't rely on that).
- **Offline durability (scoped honestly — session-68 correction):** `foundWords` persist in `game_state`/local, so a failed POST is re-derived and re-posted on any later mount **of the same, still-current puzzle** (a new session resets the ref). If the day rolls over before any such mount, that pangram's row is never inserted — a **permanent undercount of the set** (the R3 self-heal heals *tiers* from the count; nothing backfills the count itself). Accepted as bounded loss — same exposure the one-shot lane already has; do NOT build an outbox/backfill for it.

### R7 — Cleanup exclusion (unchanged from handoff scope)
- `/api/cleanup-scores` must **never** sweep `player_pangrams` (append-forever, same stance as `game_scores` / `player_achievements`). Add a regression test asserting the route's delete set never includes it.

---

## Concurrency & double-truth risk register — VERIFY each during `/tdd`

The user's stated worry. The reassuring through-line: **there is exactly one source of truth per fact, and every consumer is idempotent + monotonic**, so timing skew can only *delay* a badge to the next mount — it can never grant a wrong one or double-count.

| # | Scenario | Why it's safe |
|---|---|---|
| 1 | **Same pangrams POSTed twice** (retry, double-tap) | insert-if-absent + `UNIQUE(device,puzzle_date,word)` → 2nd write is a no-op; `COUNT(*)` unchanged. |
| 2 | **Same word farmed within one puzzle** (submit/undo/resubmit) | Same `(device, date, word)` → one row. Can't inflate. |
| 3 | **Two anonymous devices find the same pangram on the same synced daily** | Different `device_uuid` → two rows pre-merge (count is per-device, correct). On Sign-in Restore they merge onto canonical → `(canonical, date, word)` twice → UNIQUE collapses to **one**. R5 handles this. |
| 4 | **Tier POSTed twice / re-posted every mount** | `player_achievements` `UNIQUE(device, achievement_id)` insert-if-absent → no-op; `earned_at` preserved. |
| 5 | **Crossing missed** — pangram written but tier POST failed (offline/crash) | R3 mount self-heal re-detects from `pangram_count` and posts the owed tier next mount. |
| 6 | **Two count reads disagree** (POST-return vs `/api/profile/stats`) | Both are `COUNT(*)` over the *same* table — one truth, two read paths, eventually consistent. Detection is `>=` (monotonic) + idempotent, so a transiently-stale read only delays the badge, never mis-grants. |
| 7 | **Merge double-counts progress** (the classic counter trap) | Impossible by construction — progress is a row SET, not a `count = count + 1`. Union-on-merge + UNIQUE dedup (ADR 0013 Lane C). This is *the* reason it's a set-table, not a tally column. |
| 8 | **Pangrams found offline, never POSTed** | Re-derived + re-posted on any later mount of the **same, still-current puzzle** (R6). If the day rolls over first, the row is lost — a bounded, accepted undercount (same stance as a missed one-shot); tiers still self-heal once later finds push the count over. |
| 9 | **TrophyCase chip correctness under skew** | Lights on `earned.has(tierId) ‖ count >= threshold`. Stale-low count but tier earned → `earned.has` lights it. Fresh-high count but tier not yet earned (self-heal pending) → `count >= threshold` lights it. Correct under either skew (B1 design). |

**The single anchor:** the earned **tier fact** (`player_achievements` row) is the one durable truth for "earned" — written once, frozen, never revoked. `pangram_count` is only *progress/detection input*; even if two count reads momentarily disagree, the earned fact is unaffected.

---

## Suggested build order for the next session (`/tdd`)
1. Migration `…_add_player_pangrams.sql` (mirror `player_achievements` incl. `id bigint generated always as identity` — the merge repoints by `id`) + `db push`.
2. Pure lib: `detectEarnedPangramTiers(count)` + `nextPangramTierThreshold(count)` in `achievements.ts` (add `KYNIGOS_PANGRAM_ID` + a `…_TIERS` export). Red tests first. **Consider a shared generic core** — `detectEarnedTiers(tiers, value)` + `nextTierThreshold(tiers, value)` with the points fns as thin wrappers — so a 3rd tiered badge doesn't mint a 3rd copy (builder's call; keep exported names stable either way).
3. `POST /api/pangrams` (insert-if-absent, returns `{count}`) + the R2 input guards (`isISODate`, `normalizeLetters`, pangram-shape regex, array cap); no `GET`; regression tests incl. the guards.
4. Add `pangram_count` to `/api/profile/stats` (parallel `COUNT(*)` via `Promise.all`). Note: it's a *separate table*, so this is a route-level sibling query — `aggregateLifetimeStats` (a pure reduce over `game_scores` rows) is NOT the place for it.
5. `planPangramMerge` (pure, keyed `` `${puzzle_date}::${word}` `` — Supabase returns `date` columns as `"YYYY-MM-DD"` strings) + wire into `restore()`; merge tests incl. risk-register #3.
6. 3rd lane in `useAchievementSync` (delta-post per R6) + extend `fetchLeksokiposPoints` → `fetchLifetimeStats` (one stats fetch feeds points + pangram lanes) + `GameBoard` memoized `foundPangrams`/`puzzleDate` plumbing; toast + suppression tests.
7. TrophyCase: pass live pangram count for the `leksokipos-kynigos-pangram` tile + pangram progress denominator (its stats fetch already exists — just read the new field).
8. `cleanup-scores` regression test (never sweeps `player_pangrams`) — extend the existing delete-table-recording mock in `cleanupScoresRoute.test.ts`.
9. Docs: ADR 0013 "B2 resolutions" addendum + CONTEXT.md table-list row.
10. Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`.

**Manual verification caveat (shared dev+prod DB):** the lanes are gated `!isGodMode`, so god mode cannot exercise them — verifying the real flow from `npm run dev` writes **production** rows. Use a throwaway `device_uuid` and delete its `player_pangrams`/`player_achievements` rows afterwards via the Supabase MCP `execute_sql` (same caution as B1's pending manual check, session 66).
