-- Make community_*_puzzles.status a real PG enum.
--
-- The column was bare text with no CHECK — "approved", "pending",
-- "utter_garbage" and "" were all equally legal, and the generated TypeScript
-- (ADR 0017) could only say `status: string` because CHECK constraints do not
-- survive into the types; only real enums do. An enum fixes both layers at
-- once: Postgres rejects a bad write, and after regenerating
-- database.types.ts the compiler rejects it at the call site.
--
-- Vocabulary is exactly what the lifecycle writes (communityPuzzleLifecycle.ts):
-- submit inserts 'pending', approve UPDATEs to 'approved', reject DELETEs the
-- row — so 'rejected' is deliberately not a value. Verified live before
-- applying (go/no-go: an ALTER TYPE ... USING fails on any other value).
--
-- Note the deliberate divergence from nominations.status ('pending' |
-- 'accepted' | 'rejected', CHECK-constrained): nominations keep rejected rows
-- as history ("accepted"), community queues delete them ("approved" = live).
-- Same concept, different lifecycle — documented, not unified, because
-- nominations' values are load-bearing for the admin review queue.

CREATE TYPE public.community_puzzle_status AS ENUM ('pending', 'approved');

ALTER TABLE public.community_leksiarxeio_puzzles
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.community_puzzle_status
    USING status::public.community_puzzle_status,
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.community_leksindeseis_puzzles
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.community_puzzle_status
    USING status::public.community_puzzle_status,
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.community_vrestifrasi_puzzles
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.community_puzzle_status
    USING status::public.community_puzzle_status,
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.community_stavrolekso_puzzles
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.community_puzzle_status
    USING status::public.community_puzzle_status,
  ALTER COLUMN status SET DEFAULT 'pending';
