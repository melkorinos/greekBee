# `player_milestones` — one table, one route, one merge for every countable badge input

**Status:** ready
**Spec:** [`.claude/handoffs/badgeIdeas.md`](../../handoffs/badgeIdeas.md) · ADR 0013 amendment 2026-08-06 §2

Blocks [TICKET-02](TICKET-02-catalog-rebuild-launch-reset.md), which wires badges to these counters. The
podium-lane deletion that used to precede this shipped on 2026-08-06 (commit `32a866b`), so the route
conflict it warned about is gone.

## Why

Two badges become tiered in TICKET-02 and **neither has a counter**. "Reached the top rank" is not derivable
from `game_scores` — rank needs each puzzle's genius threshold, which the server never sees. New capture was
unavoidable, so one migration consolidates the existing set tables at the same time rather than adding a
third one beside them.

This is one vertical slice on purpose. The migration, the write path, the read path and the Restore merge all
cross the same seam; shipping any of them alone leaves the app broken.

## The schema

```sql
player_milestones(
  device_uuid  text    not null,
  puzzle_date  date    not null,
  kind         text    not null,          -- 'pangram' | 'word' | 'top_rank' | 'tzimani'
  detail       text    not null default '',
  value        smallint,                  -- nullable
  created_at   timestamptz not null default now()
)
unique (device_uuid, puzzle_date, kind, detail)
```

Insert-if-absent, append-forever, never swept, anon RLS = SELECT + INSERT only (the `20260716120100`
posture — copy [`20260718120000_add_player_words.sql`](../../../supabase/migrations/20260718120000_add_player_words.sql)).

Three things that are load-bearing, not stylistic:

- **`detail` is `NOT NULL DEFAULT ''`.** Postgres treats NULLs as *distinct* in a unique index, so a nullable
  `detail` on the two detail-less kinds would let the same milestone insert twice and silently break
  insert-if-absent — the guarantee ADR 0013 is built on.
- **`value`** is the word length for `kind='word'` (stamped server-side, exactly as `length` does today) and
  null elsewhere — absent is not zero. It also carries a future badge: "N words of 13+ letters" is
  `WHERE kind='word' AND value >= 13`, no row fetch.
- **There is deliberately no `game_id` column.** See the ⚠️ below.

> ⚠️ **Known future migration — do not "helpfully" add `game_id` back as a bare column.** A second game
> earning badges needs `ADD COLUMN game_id text NOT NULL DEFAULT 'leksokipos'` **and** the UNIQUE widened to
> `(device_uuid, game_id, puzzle_date, kind, detail)`, in the *same* migration. The column present but
> outside the key is the one shape that loses data silently: game B's row for the same word and date
> collides with game A's and `ON CONFLICT DO NOTHING` swallows it — no error, just an undercount.

Deliberately **not** doing, declined by the operator with reasons in the spec: a `CHECK` on `kind`, and
putting `kind` second in the UNIQUE.

## Scope

**Migration**

- [ ] New migration creating the table, its RLS policies and grants, and the rewritten
      `player_words_by_length(p_device_uuid)` RPC — now `WHERE kind='word'`, aggregating on `value`.
- [ ] Drop `player_pangrams` and `player_words` **in the same migration**. There is no data worth
      copying: TICKET-02's launch reset wipes it all, and the beta word capture is dark behind
      `FEATURE_FLAGS.achievements`. Confirm that before writing a data-migration step nothing needs.
- [ ] Regenerate `src/lib/database.types.ts` (`npx supabase gen types`) — it is generated, not hand-edited.

**Write path**

- [ ] `POST /api/milestones` replaces `/api/pangrams` and `/api/words`. One route, one sanitizer dispatching
      on `kind`, keeping the existing shape bounds (`sanitizePangramWords` / `sanitizeFoundWords`,
      `isISODate`, the ≥`WORDS_MIN_TRACKED` floor).
- [ ] **It returns counts only for the kinds the caller posted** — not all four. A lane that needs a
      crossing gets it in one round-trip with no lag (what ADR 0013 B2 engineered for pangrams); a lane that
      ignores counts pays for nothing.
- [ ] **Skip the count query entirely when zero rows were inserted.** This is a live inefficiency in
      [`words/route.ts:62`](../../../src/app/api/words/route.ts#L62) today — fix it as the route is rewritten.
- [ ] Delete `src/app/api/pangrams/` and `src/app/api/words/`.

**Client**

- [ ] **Filter to ≥10 letters client-side before posting words.** `WORDS_MIN_TRACKED` already derives from
      `achievementTuning.wordLengthBadges` and is importable. This turns ~30 requests per game into a few per
      week. The server floor **stays** as the authoritative backstop — the client filter is an optimisation,
      never the rule.
- [ ] Collapse the pangram and word lanes in
      [`useAchievementSync.ts`](../../../src/games/leksokipos/hooks/useAchievementSync.ts) onto the one route;
      `postPangrams` + `postWords` in `sync.ts` become one `postMilestones`.
- [ ] **Add the counter lane for `top_rank` and `tzimani`.** Detection is already live and continuous — the
      one-shot lane re-runs on every `foundWords`/`rank` change — but that lane posts *achievement ids* only.
      It needs a per-`(puzzle_date, kind)` ref (the way `postedPangramWordsRef` works per word), a milestone
      POST, and tier detection off the returned count. Budget this as a fifth lane's worth of work, not zero.
      TICKET-02 supplies the thresholds; this ticket supplies the plumbing.

**Read path**

- [ ] `GET /api/profile/stats`: replace the standalone pangram `COUNT` with one `GROUP BY kind`. Query count
      stays flat while two badges gain live progress values.
- [ ] `GET /api/profile/words` rewritten against the new RPC. Buckets (`bucketWordsByLength`, 10/11/12 + a
      "13+" tail) are unchanged.
- [ ] `planPangramMerge` + `planWordsMerge` collapse into one `planMilestoneMerge`, keyed on
      `(puzzle_date, kind, detail)`, wired into `restore()` in
      [`/api/auth/link`](../../../src/app/api/auth/link/route.ts) beside the achievement merge. Union +
      UNIQUE dedup; double-count on merge stays impossible by construction.

**Also touched:** `src/games/leksokipos/sync.ts`, the cleanup-scores retention regression test,
`rlsInvariantsLiveDb.test.ts`, and `.claude/aiHelper/coverageMap.md`.

## Deploying this

**One Supabase project backs both dev and prod, so `db push` is live in production immediately.** Between the
push and the Vercel deploy, prod runs old code against the new schema and every word find 500s.

**Deploy after hours, when nobody is playing, and run `npx supabase db push` and the Vercel deploy back to
back** — not days apart. If the window ever has to be long, the alternative is a create-only migration first
and a separate drop migration after the code is live. Do not do the drop early "because it's tidy."

## Accepted risk, recorded not fixed

`kind='top_rank'` and `kind='tzimani'` are client-asserted day counts with **no shape bound** — unlike words
and pangrams, whose text is regex-bounded. A scripted loop over 365 dates earns gold instantly. Same
client-trust model as scores, consistent with ADR 0013's "the server runs zero detection". A cheap partial
bound if it ever matters: reject a `puzzle_date` more than a day or two from today. Not built.

## Done when

`npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` all pass, `player_pangrams`
and `player_words` no longer exist in the DB or in `database.types.ts`, and the Trophy Case plus Λέξεις ανά
μήκος card render off `player_milestones` end to end.
