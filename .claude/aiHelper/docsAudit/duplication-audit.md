# Documentation duplication audit — 2026-08-15

> **EXECUTED 2026-08-15.** Tier 1, Tier 2 and all six contradictions are done; measured result at
> the foot of this file. Tier 3 (consolidating ADR 0013's eight amendments, auditing the two
> possibly-discharged handoffs) is **not** done — both need an operator decision first.
> A **seventh** contradiction surfaced during the work and was fixed: ADR 0021's "neither ticket
> ships alone" deploy gate had been superseded by s154's `FEATURE_FLAGS.soundCues` and is now
> recorded as spent in a 2026-08-15 amendment.

Scope: `README.md` (415), `CONTEXT.md` (280), `.claude/aiHelper/{memory,goals,reflections,log}.md`
(120/71/680/120), `docs/adr/*` (23 files, 2 158), `.claude/handoffs/*` (6 files, 978),
`.claude/tracker/*`. Total prose surface ≈ 5 150 lines.

The finding is not "these files are long". It is that **the same fact is written out in full in
four to six places**, none of which is the source of truth, and three of those copies are now
wrong. Every duplicate is a future stale claim; the repo has already paid for this twice (s138's
documentation service, s147's "thin" pool).

---

## 1. The duplicated facts, ranked by cost

| # | Fact | Written in full in | Real source of truth | Verdict |
|---|------|--------------------|----------------------|---------|
| 1 | **Game list + status** (11 rows, route, wip/hidden, one-line description) | `README.md:14-27`, `CONTEXT.md:11`, `memory.md:40-54`, `memory.md:62` (Routing row), `goals.md:39`, `README.md:231-243` (tree) | `src/config/games.ts` | 5 copies. Keep the README table (human-facing) — **delete the `memory.md` Current State table**, it is the same table with session numbers. |
| 2 | **Architecture / folder tree** | `README.md:231-344` (114 lines, per-file), `memory.md:100-111` (12 lines) | the filesystem | Keep one. The README's per-file tree is the drift champion of this repo — every seam extraction (s141, s142, s152) had to hand-edit it. Cut it to top-level folders + "read the tree, it is accurate by construction". **≈90 lines.** |
| 3 | **Tracker state** (which ISSUE/TICKET is open, status, blocking) | `README.md:374-397`, `memory.md:114`, `goals.md:55-56,60`, `handoffs/launch-readiness.md:24-61` | `.claude/tracker/` folders | 4 copies of a folder listing, and **CLAUDE.md already says the folder is the state**. Two are stale (see §2). Replace all four with a one-line pointer. **≈45 lines.** |
| 4 | **Rate-limiting / capacity accepted risk** — incl. the same SQL snippet verbatim | `CONTEXT.md:246-256`, `reflections.md:270-342` | — | Same decision told twice, 73 lines apart in one file and 11 in the other. CONTEXT keeps the *decision* (3 lines + pointer); reflections keeps the measurement table. **≈15 lines.** |
| 5 | **Sound Cues** | `ADR 0021` (176), `memory.md:94`, `CONTEXT.md:216`, `reflections.md:648-668`, `README.md:225` | ADR 0021 | 5 copies of a 3-file feature. `memory.md:94` is a compressed re-telling of the whole ADR incl. its traps. Cut to: name, ADR link, deploy-gate status. **≈25 lines equivalent.** |
| 6 | **Offline Mode (parked)** | `ADR 0010`, `handoffs/offlineFeature-handoff.md` (112), `memory.md:76`, `CONTEXT.md:214+218`, `reflections.md:419-437`, `goals.md:46` | ADR 0010 + the handoff | 6 copies of a feature nobody can reach. The handoff exists precisely to hold this. **≈40 lines.** |
| 7 | **Achievements / badges** | `ADR 0013` (352), `memory.md:85`, `CONTEXT.md:134-146` (7 glossary entries) | ADR 0013 | `memory.md:85` restates §7's art decisions verbatim-in-spirit. ADR 0013 is itself 8 stacked amendments — three supersede each other on the same points (2026-07-18, 08-06, 08-07). **A consolidation pass on 0013 alone is worth ~80 lines.** |
| 8 | **Topothesies** | `ADR 0018` (166), `memory.md:93` | ADR 0018 | `memory.md:93` is a **single table cell of ~1 200 words** replaying s114–s136 UX corrections. That is log content in the memory file. Cut to the invariants (peel rule, `PROXIMITY_MAX_KM` re-read, capital-picks-the-landmass) + ADR link. **≈35 lines equivalent.** |
| 9 | **Launch posture / runbook** | `memory.md:5-37`, `goals.md:52-57`, `handoffs/launch-readiness.md` (212) | the handoff | The handoff is the designated home and says so. memory + goals restate its resolved half. **≈35 lines.** |
| 10 | **Rank ladder table** (8 rows, thresholds) | `README.md:196-211`, `CONTEXT.md:82` | `RANKS` in `ranking.ts` | README's own caption says the array is the source of truth — so the table is pure drift risk, and it **has already been wholly wrong once** (log, s83–95). Delete the table, keep the sentence. **16 lines.** |
| 11 | **Per-game leaderboard scoring** | `README.md:354-370`, `CONTEXT.md` Score entries, `gameRules.ts` | `gameRules.ts` | Eight paragraphs restating point values that live in config. **≈17 lines.** |
| 12 | **Leksokipos step-by-step walkthrough** | `README.md:162-226` | the code | 65 lines naming files, hooks and reducer actions. Every one is a hand-maintained pointer into code that moves. Keep steps 1–8 as ~10 lines of flow, drop the file paths. **≈50 lines.** |
| 13 | **`SCORE_SCALE` 0.75 + soft cap** | `README.md:193`, `CONTEXT.md:74`, `memory.md:75` | `gameRules.ts` | Already drifted once (85% → 0.75, fixed s138). Three copies of one number. |
| 14 | **Supabase migration workflow** | `README.md:64-75`, `CLAUDE.md` standing rule, `memory.md:83`, user auto-memory | — | Four copies of "new migration file + `db push`, never the dashboard". |
| 15 | **coverageMap.md location + "never load at session start"** | `CLAUDE.md`, `README.md:408`, `memory.md:116` | — | Harmless but three copies. |
| 16 | **"Measure the artifact, don't trust the response"** | `reflections.md` §s130, s132, s139, s140, s145, s146 (×6 instances), s147, s150, s151, s153 | — | **The single biggest block in the repo.** ~11 sections, each re-narrating the same rule with a new anecdote, several explicitly cross-referencing the others ("this is the fourth time", "sixth instance, s150"). One entry with a dated instance list would hold the same lesson in **~130 fewer lines**. |

---

## 2. Where the duplication has already gone wrong

These are live contradictions, found by diffing the copies:

1. **`README.md:392`** — "TICKET-05 … **blocks any deploy** while the 🔊 toggle plays silence."
   `memory.md:114` records the s154 split: Part A shipped a `FEATURE_FLAGS.soundCues` gate, the MP3s
   are now **post-launch, optional, blocking nothing**. The README states a deploy gate that no
   longer exists. `README.md:225` repeats it ("do not deploy until they land").
2. **`README.md:388-393`** — the tickets table omits **`TICKET-11`**, which is on disk and half-shipped.
3. **`goals.md:57`** — "the platform logo … is the only genuinely untracked item, and **`TICKET-10`
   depends on it**". s154 folded the logo *into* `TICKET-10`; the dependency was dissolved.
4. **`memory.md:88` vs `memory.md:114`** — e2e baseline is "**13 passed / 2 skipped** (measured s152;
   the 10 recorded at s148 was already stale)" in one row and "**10 passed / 2 skipped**" in the next.
   Same file, contradicting itself, both citing the same suite.
5. **`reflections.md:271`** — still instructs "Set a Supabase row-count alert … must be configured by
   the operator", then the very next line, and again 20 lines later, records that **the alert cannot
   be built on any plan**. Three sedimentary layers of one decision, oldest first.
6. **`reflections.md:170-189` and `reflections.md:258-259`** — the Leksindeseis one-puzzle-pool
   finding, written out twice in the same file, 70 lines apart.

Points 1–4 are exactly the failure the tracker rules were written to prevent: a snapshot of a
folder, kept by hand, read by a cold session as current.

---

## 3. Recommended trims

**Tier 1 — pure deletion, no judgement needed (≈180 lines)**

- `README.md`: rank-ladder table (16), leaderboard scoring section (17), the step-by-step
  walkthrough's file-path detail (50), per-file architecture tree → top-level only (90),
  tracker tables → pointer (24).
- Fixes items 1, 2, 3 of §2 by removing the copies rather than re-syncing them.

**Tier 2 — condense in place (≈250 lines)**

- `reflections.md`: merge the eleven "measure the artifact" sections into one dated entry (≈130);
  fold the three rate-limiting layers into the current answer (≈40); delete the duplicate
  Leksindeseis entry (≈10); the pre-s140 tensions that are now shipped-and-closed
  (`TICKET-03` mock, s142 deploy window, `coverageMap` move) belong in the Resolved archive (≈70).
  **680 → ~430.**
- `memory.md`: Current State table (item 1), Topothesies cell (item 8), Sound Cues cell (item 5),
  launch posture (item 9), Known Tech Debt paragraph (item 3). The file is at its 120-line cap and
  each cell is doing an ADR's job — cutting these buys room for the next locked decision.
- `goals.md`: items 2, 3, 4 of Current Focus are a re-telling of `launch-readiness.md`. Replace
  with the pointer the section already contains.

**Tier 3 — needs a decision first**

- `ADR 0013`: eight amendments, three of which supersede each other. A consolidation into one
  current statement + a "superseded" appendix is right, but rewriting an ADR's history is an
  operator call, not a tidy-up.
- `handoffs/`: `HANDOFF-monetization.md` (127) and `engagementEpic.md` (123) — check whether either
  still names an open thread. s143's tension already flagged that **the Dream promotes content
  reliably and deletes files unreliably**; two of the six handoffs look like the same shape.

---

## 4. What not to trim

- **`CONTEXT.md`'s glossary** is the one place where the duplication is the point — it defines
  terms, and a term defined once and used everywhere is the opposite of drift. Its `Miss Rule`,
  `Community Puzzle Lifecycle` and `Round Spine` entries are load-bearing. Trim only the two
  entries that restate config numbers (items 4, 13).
- **`log.md`** is already era-compressed and under its cap. Leave it.
- **The ADRs' *decisions*.** Everything above cuts *copies of* ADRs, never the ADRs.
- **`coverageMap.md`** — not read at session start, costs nothing.

**Estimated total: ~430 lines removed, zero facts lost, six live contradictions closed.**

---

## 5. Measured result

| File | Before | After | Δ |
|---|---|---|---|
| `README.md` | 415 | 259 | **−156** |
| `.claude/aiHelper/reflections.md` | 680 | 537 | **−143** |
| `.claude/aiHelper/memory.md` | 120 | 105 | **−15** (15 lines of headroom under the cap) |
| `CONTEXT.md` | 280 | 271 | **−9** |
| `.claude/aiHelper/goals.md` | 71 | 71 | 0 (rewritten in place, per-ticket table → pointer) |
| **Total** | **1 566** | **1 243** | **−323** |

`reflections.md` landed at 537 rather than the estimated 430. The gap is honest: the estimate
assumed more of the remaining sections were duplicates than actually were. Once the nine
"measure the artifact" instances collapsed into one ledger, what was left — the s152 Playwright
limitation, the s150 skill-cache tension, the s151 operator-artifact rule, the capacity
measurement table, the round-spine and community-lifecycle lessons — is each unique and live.
**Cutting further would have removed content, not copies**, which is not what this pass was for.

### The consolidation worth knowing about

Nine sections narrating *"measure the artifact, don't trust the response"* (s130 → s150) became one
entry with a **nine-row ledger**: session, narrator, claim, truth, and what the check would have
cost. That framing was not available while they were separate — the ledger makes visible that the
narrators now include an external API, my own tooling, a type signature, the repo's own spec, the
consensus of secondary sources, a spec's trap list, a named test file, a ticket's file list, and a
tool — and that the check escalated from one `grep` to *having to call the tool*, which nothing
about reading a ticket prompts. Every live consequence was carried forward (the Sound Cue licence
rule, the un-guardable mobile header, the parked Leksindeseis pool).
