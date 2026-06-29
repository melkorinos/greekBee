-- Adds is_perfect flag to game_scores.
-- Set to true when a Leksokipos player finds every valid word (Τζιμάνι).
ALTER TABLE public.game_scores
  ADD COLUMN IF NOT EXISTS is_perfect boolean NOT NULL DEFAULT false;
