# Handoff — Community Puzzles Feature + Scoring Refactor

**Date:** 2026-05-27 (updated end-of-session)
**Branch:** `work`
**Context files:** `.claude/aiHelper/soul.md`, `memory.md`, `goals.md`, `reflections.md`, `log.md`

---

## Status

| Area | Status |
|---|---|
| Scoring refactor (leksiarxeio_scores → game_scores) | ✅ Code complete |
| Community puzzle API routes (submit + admin list) | ✅ Complete |
| Admin PATCH review routes | ✅ Complete |
| Data loaders (community-first + fallback) | ✅ Complete |
| Submission UI modals | ✅ Complete |
| Landing page submit buttons | ✅ Complete |
| Leksikastirio admin tabs | ✅ Complete |
| Attribution on game boards | ✅ Complete |
| Tests | ✅ Complete |
| **Supabase: create 2 new tables** | ❌ Human step |
| **Supabase: migrate leksiarxeio_scores → game_scores** | ❌ Human step |
| **Supabase: drop leksiarxeio_scores table** | ❌ Human step |

---

## Architecture decisions made this session

- **Consumed community puzzles are deleted immediately** — no `used_date` column. Simpler schema, no cleanup job.
- **One community puzzle row serves all 5 Leksiarxeio lengths** — `getAllTodaysLeksiarxeioPuzzles` is the single async entry point; it queries once, deletes once, builds all 5 puzzles atomically.
- **Attribution returned alongside puzzles** — `submitter_name` is never part of `LeksiarxeioPuzzle` type (avoids leaking display copy into game state / localStorage).
- **Leksindeseis fallback** uses `dateToIndex(date) % pool.length` (deterministic rotation), not "most recent".
- **Admin review** uses `PATCH` + `X-Admin-Secret` header (consistent with community puzzle GET routes).

---

## Human steps (in order)

### 1. Create the two Supabase tables

Run in Supabase SQL editor:

```sql
create table public.community_leksiarxeio_puzzles (
  id             bigserial    primary key,
  submitter_name text         not null default '',
  data           jsonb        not null,  -- {"4":"word","5":"word","6":"word","7":"word","8":"word"}
  status         text         not null default 'pending',  -- 'pending' | 'approved'
  created_at     timestamptz  not null default now()
);

create table public.community_leksindeseis_puzzles (
  id             bigserial    primary key,
  submitter_name text         not null default '',
  data           jsonb        not null,  -- [{category, words:[w,w,w,w], difficulty:1-4}×4]
  status         text         not null default 'pending',
  created_at     timestamptz  not null default now()
);
```

### 2. Migrate leksiarxeio_scores → game_scores

Migration SQL is in `.claude/architecture-review-20260527-203039.html` under "Migration SQL".

Verify row counts match before and after:
```sql
select count(*) from leksiarxeio_scores;
-- run migration
select count(*) from game_scores where game_id = 'leksiarxeio';
```

### 3. Drop leksiarxeio_scores

Once you've verified the migration:
```sql
drop table public.leksiarxeio_scores;
```

After this, update `CONTEXT.md` — remove the `leksiarxeio_scores` row from the database tables section (table count drops from 9 to 8).

---

## Smoke test (step by step)

Run these with the dev server live (`npm run dev`). Replace `YOUR_SECRET` with `ADMIN_SECRET` from `.env.local`.

### A — Submit a Leksiarxeio community puzzle

1. Open the home page `/`.
2. On the Leksiarxeio card, click the ✏️ button (right column, below the `?`).
3. Fill in one word per length (4–8 letters). Use real Greek words from the word pools, e.g.:
   - 4: `αγαπ`  → likely invalid, try `ελλη` or any word you know is in `words-4.json`
   - Or submit deliberately invalid words to test the 422 error path — you should see "Η λέξη δεν βρίσκεται στη λίστα" and a "Πρότεινε τη λέξη" link.
4. Enter a submitter name (e.g. `Δοκιμή`).
5. Click **Αποστολή**.
6. **Expected:** "Ευχαριστούμε! Το παζλ σου στάλθηκε για έλεγχο."

### B — Admin: view and approve

1. Open `/leksikastirio?admin=YOUR_SECRET`.
2. You should see two extra tabs: **Παζλ Leksiarxeio** and **Παζλ Leksindeseis**.
3. Click **Παζλ Leksiarxeio**.
4. **Expected:** the puzzle you submitted appears as a card showing all 5 words + submitter name.
5. Click **Έγκριση**.
6. **Expected:** the card disappears from the list.

### C — Verify the approved puzzle serves as the daily puzzle

1. Open `/leksiarxeio` in a new tab (or hard-refresh).
2. **Expected:** the page loads with "Παζλ από Δοκιμή" below the header.
3. The answers for each length should be the words you submitted.
4. Play one length to verify the game works normally.

### D — Verify the queue is now empty

1. Back in Leksikastirio → **Παζλ Leksiarxeio** tab.
2. **Expected:** "Δεν υπάρχουν παζλ σε αναμονή." (the row was deleted on consumption).

### E — Submit and reject a Leksindeseis puzzle

1. On the home page `/`, click the ✏️ button on the Leksindeseis card.
2. Fill in 4 groups (category + 4 words each), easiest first.
3. Submit → success message.
4. In Leksikastirio → **Παζλ Leksindeseis** tab → card appears.
5. Click **Απόρριψη** → card disappears (row hard-deleted).

### F — Verify fallback still works

1. Ensure the community queues are empty (no approved rows in either table).
2. Open `/leksiarxeio` → loads normally from static word pool, **no attribution line shown**.
3. Open `/leksindeseis` → loads normally from `puzzles-connections.json`, no attribution.

---

## Key files changed this session

| File | Change |
|---|---|
| `src/app/api/community-puzzles/leksiarxeio/[id]/review/route.ts` | New — PATCH approve/reject |
| `src/app/api/community-puzzles/leksindeseis/[id]/review/route.ts` | New — PATCH approve/reject |
| `src/data/leksiarxeio/index.ts` | Async community-first loader; `getTodaysLeksiarxeioPuzzle` removed |
| `src/data/leksindeseis/index.ts` | Async community-first loader; deterministic fallback |
| `src/app/leksiarxeio/page.tsx` | Async server component; attribution render |
| `src/app/leksindeseis/page.tsx` | Async; attribution; null-puzzle empty state |
| `src/components/leksiarxeio/CommunityLeksiarxeioSubmitModal.tsx` | New |
| `src/components/leksindeseis/CommunityLeksindeseisSubmitModal.tsx` | New |
| `src/components/shared/SubmitPuzzleButton.tsx` | New — landing page trigger |
| `src/app/page.tsx` | Submit buttons on Leksiarxeio + Leksindeseis cards |
| `src/app/leksikastirio/page.tsx` | Two admin-only community puzzle tabs |
| `src/test/leksiarxeio/dataLoader.test.ts` | Updated for async API + community path |
| `src/test/leksindeseis/dataLoader.test.ts` | Updated for async API + community path |
| `src/test/shared/communityPuzzlesReviewRoute.test.ts` | New |
| `CONTEXT.md` | Two new tables documented |

---

## Test status

- **819 tests pass**, 2 pre-existing leaderboard failures (known, unrelated to this feature), 0 lint errors, build clean.
