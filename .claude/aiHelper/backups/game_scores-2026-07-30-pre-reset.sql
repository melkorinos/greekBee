-- Backup of game_scores rows for puzzle_date = '2026-07-30', captured
-- 2026-07-30 immediately before the Leksokipos difficulty-rebalance reset
-- (session 131). Six rows across three games.
--
-- Context: the rebalance pruned the puzzle corpus 1008 -> 799 and reflowed
-- every date, so 2026-07-30 now serves a DIFFERENT Leksokipos board than the
-- one these scores were set on. The four leksokipos rows were deleted so
-- players start today's new board from scratch.
--
-- The leksodromia and leksoplegma rows are recorded here for completeness but
-- were NOT deleted — those games were not rebalanced and their puzzles are
-- unchanged.
--
-- To restore the deleted leksokipos rows, run the INSERT below. `id` is
-- included so the original primary keys are preserved; drop the id column and
-- let the sequence assign new ones if those ids have since been reused.

INSERT INTO game_scores (id, game_id, puzzle_date, device_id, display_name, score, data, is_perfect) VALUES
  (25467, 'leksokipos', '2026-07-30', '6d98c60e-8ad5-449d-902e-440078478294', 'Κινέζος  🚂',     458, '{"words":83,"pangrams":0}'::jsonb, false),
  (25452, 'leksokipos', '2026-07-30', 'ae866b81-6f30-437a-80e5-288c91a9ab6b', 'Romina',          358, '{"words":69,"pangrams":0}'::jsonb, false),
  (25666, 'leksokipos', '2026-07-30', '5ed6f75c-3207-4798-a6f9-a48c260486b3', 'Ντου',            120, '{"words":26,"pangrams":0}'::jsonb, false),
  (25503, 'leksokipos', '2026-07-30', '9f879d4b-c378-4cad-b396-ffe09b70167a', 'Κουδούνι πάνω',   110, '{"words":22,"pangrams":0}'::jsonb, false);

-- NOT deleted, recorded for reference only:
--   (25768, 'leksodromia', '2026-07-30', '6d98c60e-…', 'Κινέζος  🚂', 158, '{}', false)
--   (25748, 'leksoplegma', '2026-07-30', '6d98c60e-…', 'Κινέζος  🚂',  65, '{}', false)
