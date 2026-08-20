# Remove Community Puzzle submission from Λεξιαρχείο and Βρες τη Φράση

**Status:** ready
**Spec:** [ADR 0027](../../../docs/adr/0027-two-games-lose-scoring-and-community-submission.md) §2, §4

## Why

Both Games accept player-submitted puzzles through the ➕ button on their picker card. Measured live
on 2026-08-20, **both queues are empty** — `community_leksiarxeio_puzzles` 0 rows,
`community_vrestifrasi_puzzles` 0 rows. The feature shipped, was announced to nobody, and was never
used once. It is being removed before launch rather than carried into it.

Removal is deletion, not a flag (ADR 0027 §2). Λεξινδέσεις keeps its submission untouched — it is
`hidden`, so it advertises nothing, and touching it would leave `ScheduledPuzzleTable` with no
members. Stavrolekso is out of scope entirely; community submission *is* that Game.

Both loaders already own a deterministic static fallback, so removing the community read is not a
content change: the same date returns the same puzzle it would have returned with an empty queue.

## Scope

### Submission UI

- [ ] Delete `src/components/leksiarxeio/CommunityLeksiarxeioSubmitModal.tsx` and
      `src/components/vrestifrasi/CommunityVresTinFrasiSubmitModal.tsx`.
- [ ] `src/components/shared/SubmitPuzzleButton.tsx` — narrow `Props["game"]` to `"leksindeseis"`
      and delete the two branches. **Do not delete the component** — Λεξινδέσεις still uses it.
- [ ] `src/app/page.tsx` `submitButtonFor()` — remove `leksiarxeio` and `vrestifrasi` from the
      three-way id check, leaving `leksindeseis`. Note the comment above it explains the
      community-puzzle buttons stay explicit *because* "accepts player submissions" has no
      capability behind it — that reasoning still holds for the one Game left; keep it accurate.

### API routes

- [ ] Delete `src/app/api/community-puzzles/leksiarxeio/route.ts` and its `[id]/review/route.ts`.
- [ ] Delete `src/app/api/community-puzzles/vrestifrasi/route.ts` and its `[id]/review/route.ts`.
- [ ] Delete `src/games/leksiarxeio/lib/validateSubmission.ts` and
      `src/games/vrestifrasi/lib/validateSubmission.ts` — verified 2026-08-20 that each has exactly
      one importer, its own route. Remove any `lib/index.ts` re-export.

### Data loaders — the fallback becomes the only path

- [ ] `src/data/leksiarxeio/index.ts` — remove the `consumeApprovedPuzzle` call and the
      `submitter_name` it returns. The static rotation stays exactly as it is.
- [ ] `src/data/vrestifrasi/index.ts` — same.
- [ ] Decide what happens to the `submitter_name` field on each loader's return type and the
      credit line the pages render from it. It can only ever be `null` now, so it goes — but
      **check the page components** (`src/app/leksiarxeio/page.tsx`, `src/app/vres-tin-frasi/page.tsx`)
      for a credit surface before removing the field, or you will leave a dangling prop.
- [ ] Both loaders lose their only `await`. Consider whether they should stop being `async` — if so,
      every caller changes, so check `src/test/shared/dailyPuzzleSelection.test.ts` and the archive
      navigation paths first. Leaving them `async` is acceptable; note whichever you chose.
- [ ] `src/test/shared/deploymentReadiness.test.ts` — the post-feature protocol requires updating
      this whenever a data loader's static imports change. Verify.

### Lifecycle module

- [ ] `src/lib/communityPuzzleLifecycle.ts` — `CommunityPuzzleTable` is derived from `TableName`, so
      it narrows on its own once TICKET-24 drops the tables. **Until then it still names four
      tables.** Do not hand-edit the type. What *does* need editing is the module's header comment,
      which describes "the four tables this module drives" and names the games — that becomes false.
- [ ] `ScheduledPuzzleTable` ends up meaning `community_leksindeseis_puzzles` alone. Its comment
      explains the Stavrolekso exclusion; rewrite so a cold reader is not told there are three
      consuming queues.

### Leksikastirio review queue

- [ ] `src/app/leksikastirio/page.tsx` — remove `leksiarxeio` and `vrestifrasi` from the
      `CommunityTab` union, the tab-label map, the body-renderer map, and the `communityTabs` array
      (line ~372). Two tabs remain: Λεξινδέσεις and Stavrolekso.
- [ ] Delete the `LeksiarxeioBody` and `VresTinFrasiBody` renderers and the
      `LeksiarxeioCommunityPuzzle` / `VresTinFrasiCommunityPuzzle` types feeding them.

### Tests

- [ ] Delete `src/test/leksiarxeio/validateSubmission.test.ts` and
      `src/test/vrestifrasi/validateSubmission.test.ts`.
- [ ] Update: `src/test/shared/communityPuzzleLifecycle.test.ts`,
      `src/test/shared/communityPuzzleScheduling.test.ts`,
      `src/test/shared/communityPuzzlesReviewRoute.test.ts`,
      `src/test/leksikastirio/communityQueue.test.tsx`,
      `src/test/leksiarxeio/dataLoader.test.ts`, `src/test/vrestifrasi/dataLoader.test.ts`,
      `src/test/shared/dailyPuzzleSelection.test.ts`.
      Several of these use the two removed tables as their fixture; re-point them at Λεξινδέσεις
      rather than deleting the coverage — the lifecycle module keeps every transition it had.
- [ ] `src/test/shared/rlsInvariantsLiveDb.test.ts` — it runs against the live DB. Check whether it
      asserts policies on either dropped table; if so it must be updated **in this ticket**, before
      TICKET-24 drops them, or the suite goes red between the two.
- [ ] Grep `.claude/aiHelper/coverageMap.md` before touching any test file; update it at the end.

### Docs

- [ ] `CONTEXT.md` line 60 — **Community Puzzle Lifecycle** glossary entry names all three consuming
      loaders. Rewrite to one.
- [ ] `CONTEXT.md` line 108 — **Phrase Pool** says community-approved phrases take priority. That
      becomes false; the static JSON is now the only source.
- [ ] `CONTEXT.md` lines 246 and 248 — delete both table rows. **Coordinate with TICKET-24.**
- [ ] `CONTEXT.md` line 278 — the launch-reset paragraph lists "the four `community_*_puzzles`" as
      kept content. Two of them will not exist.
- [ ] `supabase/scripts/launch-reset.sql` — its KEPT comment block names both dropped tables and
      calls community puzzles "the expensive, irreplaceable half of the beta". **Rewrite the block,
      never annotate it** (standing rule). Both queues were empty, so that claim was already false
      for these two.
- [ ] `.claude/aiHelper/memory.md` — the **Community Puzzle scheduling** row says `scheduled_date`
      sits on "the three *consuming* tables". Rewrite. Also the **The launch reset** row's KEPT list.
- [ ] `.claude/aiHelper/goals.md` line 42 — the Community pipeline summary names all three Games.
- [ ] `README.md` line ~192 — check the `communityPuzzleLifecycle` mention in the architecture map.
- [ ] ADR 0015 §Vres Tin Frasi and ADR 0006 both reference the vrestifrasi submission route's
      `WORD_POOL`. **These are dated history and must NOT be rewritten** (standing rule: ADRs stay
      true about the past). Verify no *current-state* doc points a reader at them for live behaviour.

## Done when

`npm run test -- --run`, `npx eslint .` and `npm run build` all pass with zero failures; no ➕ button
renders on either Game's picker card; `/leksikastirio` shows two community tabs; both Games serve
their static daily puzzle unchanged for a pinned `?puzzle=` date; `grep -rn "community-puzzles/leksiarxeio\|community-puzzles/vrestifrasi" src/`
returns nothing; and `npm run test:e2e` passes.

**Do not run the migration from this ticket.** TICKET-24 owns it, and must not run until this is
deployed to production — an old deployed bundle POSTing to a dropped table is the one failure mode
the ordering exists to prevent (ADR 0027 §5).
