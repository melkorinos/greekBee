-- ADR 0027 §4 — both queues measured empty; the submitting code is gone as of
-- ADR 0027. An empty table left in the schema reads as a live feature.
drop table if exists public.community_leksiarxeio_puzzles;
drop table if exists public.community_vrestifrasi_puzzles;

-- ADR 0027 §5 — Leksiarxeio's per-length fold was `data`'s only writer and nothing
-- ever read it back. Dead since the scoring removal shipped on 2026-08-20.
alter table public.game_scores drop column if exists data;

-- ISSUE-05 — dead since ADR 0013 retired the perfect-round concept. 0 rows true,
-- 583 false. Never read, never written, by anything but the generated types.
alter table public.game_scores drop column if exists is_perfect;

-- ISSUE-01 §3 — GET /api/nominations/lookup matches no index and scans the table on
-- every nomination-modal open. Measured TICKET-14: index-only scan at every scale
-- including today's 191 rows, 3 buffers vs 1,064. ~2 MB at 50,000 rows.
create index if not exists nominations_word_direction_status_idx
  on public.nominations (word, direction, status);

-- ISSUE-01 §3 — the one non-normalised row in 191. Final sigma, so a re-proposal
-- normalises to ιουνιοσ and its prior-rejection warning can never fire.
update public.nominations set word = 'ιουνιοσ'
 where word = 'ιουνιος' and direction = 'remove';
