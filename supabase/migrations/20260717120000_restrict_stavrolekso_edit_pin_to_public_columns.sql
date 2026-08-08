-- Stop the public anon key from reading community_stavrolekso_puzzles.edit_pin.
--
-- The baseline shipped `GRANT ALL ON TABLE … TO anon` plus
-- `CREATE POLICY "anon select" … FOR SELECT TO anon USING (true)`. RLS has no
-- column-level filtering, so that table-wide SELECT exposed `edit_pin` next to
-- the public browse columns: a direct PostgREST call with ?select=edit_pin
-- returned the PIN in plaintext to anyone holding the anon key, which ships in
-- every page's JS bundle. The PIN *is* the authorisation for the creator-edit
-- flow (ADR 0005), so that let anyone harvest PINs and edit any pending puzzle
-- through the legitimate route.
--
-- Column-level GRANTs are the only mechanism that filters columns here, and
-- PostgREST honours them: asking for a column with no grant is a hard 42501
-- rather than the silent zero-row answer RLS gives. So the SELECT privilege is
-- revoked and re-granted over exactly the public browse surface.
--
-- What deliberately stays:
--   * the "anon select" policy — the browse paths (/stavrolekso landing,
--     /stavrolekso/[id], the public approved list) still need it, and it now
--     only reaches columns anon holds a grant on.
--   * anon INSERT — the maker's submit path writes edit_pin. INSERT is a
--     separate privilege, untouched by revoking SELECT. Its `.select("id")`
--     RETURNING clause keeps working because `id` stays in the grant below.
--
-- `authenticated` gets the same treatment. The issue only named anon, but that
-- role is just as public — anyone can sign in with Google and get one — and it
-- held an identical SELECT on edit_pin. It has no RLS policy on this table, so
-- this changes no behaviour today; it stops the grant from becoming a hole the
-- moment someone adds one.
--
-- The read side of the PATCH edit route moves to the service-role client to
-- match (see src/app/api/community-puzzles/stavrolekso/[id]/route.ts) — its PIN
-- lookup is the one legitimate reader of this column, and it is server-side.
--
-- Checked before applying: the table held zero rows, so no PIN was ever exposed
-- and none needed rotating.

REVOKE SELECT ON TABLE public.community_stavrolekso_puzzles FROM anon;
REVOKE SELECT ON TABLE public.community_stavrolekso_puzzles FROM authenticated;

GRANT SELECT (id, title, submitter_name, data, status, created_at)
  ON TABLE public.community_stavrolekso_puzzles TO anon;

GRANT SELECT (id, title, submitter_name, data, status, created_at)
  ON TABLE public.community_stavrolekso_puzzles TO authenticated;
