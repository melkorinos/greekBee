-- Lock down transfer_codes: server-only table, deny-by-default for anon.
--
-- The baseline shipped `anon ALL USING (true) WITH CHECK (true)`, which let the
-- public anon key SELECT every pending code together with the device_uuid it
-- maps to. device_uuid is the platform's de-facto bearer credential (it lets
-- you post scores as that player, rename their profile, read their game_state),
-- and this table was the one place anon could enumerate the mapping.
--
-- Both API routes (/api/transfer, /api/transfer/claim) now use the service-role
-- client, which bypasses RLS — so anon needs nothing here. No replacement
-- policy is created on purpose: RLS stays enabled with zero anon policies,
-- the same deny-by-default posture as identity_audit.

DROP POLICY "anon access" ON public.transfer_codes;
