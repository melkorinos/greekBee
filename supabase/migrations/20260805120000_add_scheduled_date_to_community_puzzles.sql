-- Scheduled release for Community Puzzles.
--
-- An approved Community Puzzle is now pinned to a future calendar date instead of
-- sitting in an undated FIFO queue. This closes two defects in the serve path
-- (consumeApprovedPuzzle), both latent only because every queue is currently empty:
--
--   1. The date was ignored. The three loaders each take a `date` but queried with
--      no date filter, so ANY date requested — including an archive date reached
--      through the leaderboard day-strip's ?puzzle= link — served whatever row sat
--      at the head of the queue.
--   2. The row was DELETEd on serve, and the loaders run on every page load. A
--      refresh therefore destroyed a community puzzle permanently and served the
--      next one, so two players on the same day could get different puzzles and a
--      handful of refreshes drained the queue.
--
-- Serving is now a non-destructive read keyed on (status='approved', scheduled_date).
-- Approval assigns the earliest free date strictly after today (or an admin-supplied
-- future date); a date with no scheduled row falls through to the game's static
-- rotation, which is also what every past date gets.
--
-- Nullable on purpose: `pending` rows have no release date, and NULL is what the
-- approval path reads as "this date is not taken". A partial unique index enforces
-- one puzzle per date per game — the app picks a free date, and the index is the
-- backstop if two approvals ever race.
--
-- community_stavrolekso_puzzles is deliberately NOT included: its rows are never
-- consumed (players browse the whole approved pool), so it has no release date.

ALTER TABLE public.community_leksiarxeio_puzzles  ADD COLUMN scheduled_date date;
ALTER TABLE public.community_leksindeseis_puzzles ADD COLUMN scheduled_date date;
ALTER TABLE public.community_vrestifrasi_puzzles  ADD COLUMN scheduled_date date;

-- One approved puzzle per date, per game. Partial so the many NULL-dated pending
-- rows do not collide with each other.
CREATE UNIQUE INDEX community_leksiarxeio_puzzles_scheduled_date_key
  ON public.community_leksiarxeio_puzzles (scheduled_date)
  WHERE scheduled_date IS NOT NULL;

CREATE UNIQUE INDEX community_leksindeseis_puzzles_scheduled_date_key
  ON public.community_leksindeseis_puzzles (scheduled_date)
  WHERE scheduled_date IS NOT NULL;

CREATE UNIQUE INDEX community_vrestifrasi_puzzles_scheduled_date_key
  ON public.community_vrestifrasi_puzzles (scheduled_date)
  WHERE scheduled_date IS NOT NULL;
