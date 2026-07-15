-- Vres Tin Frasi: convert stored leaderboard values from raw attempt counts
-- (lower-is-better) to points (higher-is-better) — ADR 0014.
--
-- Old semantics (pre-flip): the client posted `won ? attempts : 7`, so a row's
-- score was the attempt count — 1..6 for a win (fewer = better), 7 for a loss.
-- New semantics: points = scoreVresTinFrasi(attempts, won) = max(1, 7 - attempts)
-- for a win (6 for a 1-guess win → 1 for a 6-guess win), 0 for a loss. The board
-- now posts points and the leaderboard sorts desc like every other game.
--
-- One-shot rewrite so live rows rank correctly under the new sort instead of
-- inverting for the rest of their 7-day leaderboard window. Order matters: the
-- first UPDATE only touches 1..6 (a win maps 1↔6, never producing a 7), so the
-- loss rows (score 7) are still 7 when the second UPDATE zeroes them.
UPDATE public.game_scores
  SET score = 7 - score
  WHERE game_id = 'vrestifrasi' AND score BETWEEN 1 AND 6;

UPDATE public.game_scores
  SET score = 0
  WHERE game_id = 'vrestifrasi' AND score = 7;
