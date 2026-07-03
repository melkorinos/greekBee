-- identity_audit: append-only log of identity-mapping changes (ADR 0012, corrected 2026-07-03).
--
-- One row per /api/auth/link call that ESTABLISHED a mapping the profile row
-- didn't already hold: a first link (null -> account) or a sign-in that
-- overwrote another account's mapping on a shared device. Disconnect never
-- writes here (it is local-only; player_profiles keeps the pair).
--
-- Written server-side via the service-role client only. RLS is enabled with
-- ZERO policies, so anon/authenticated clients can neither read nor write.
-- No FK to auth.users on purpose: rows must survive account deletion so
-- Admin Restore (docs/admin-restore.md) can reconstruct any mapping that was
-- later overwritten or deleted. Append-forever, same stance as game_scores.
CREATE TABLE public.identity_audit (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id uuid        NOT NULL,
  device_uuid  text        NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.identity_audit ENABLE ROW LEVEL SECURITY;

-- Admin Restore looks up history by account.
CREATE INDEX identity_audit_auth_user_id_idx
  ON public.identity_audit USING btree (auth_user_id);
