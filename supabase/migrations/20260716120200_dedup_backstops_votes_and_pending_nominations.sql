-- DB backstops for the two check-then-act dedup flows (session 86's deferred
-- "Option A"). Both promises — one vote per device per nomination, one pending
-- nomination per (word, direction) — were enforced only by a read-then-write
-- in the route, so concurrent requests (two tabs, two devices, a held Enter
-- key) could land silent duplicates. The routes handle the new 23505s.

-- One vote per (nomination, device). Undo/switch key on this row.
ALTER TABLE public.nomination_votes
  ADD CONSTRAINT nomination_votes_nomination_device_unique
  UNIQUE (nomination_id, device_id);

-- One *pending* nomination per (word, direction). Partial: accepted/rejected
-- history rows may repeat freely (re-proposals after rejection are a feature).
-- Words are stored normalized as of session 86, so the index keys on the
-- normalized form; older non-normalized rows are all accepted/rejected and
-- can't participate.
CREATE UNIQUE INDEX nominations_pending_word_direction_key
  ON public.nominations (word, direction)
  WHERE status = 'pending';
