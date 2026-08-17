-- Compatibility shim: the smallest amount of Supabase a stock local PostgreSQL
-- needs before this project's migrations will apply against it.
--
-- ADR 0024 measured the surface rather than assuming it: across every migration
-- in supabase/migrations/, the only objects outside `public` that any migration
-- touches are auth.uid() and auth.users. Nothing references storage, vault,
-- graphql or any Supabase-only extension. That measurement is what lets this
-- file replace Docker and `supabase start`.
--
-- KEEP IT SMALL. If a future migration needs more than this, the honest fix is
-- to add the one object it needs — not to start reproducing Supabase locally.

CREATE SCHEMA IF NOT EXISTS auth;

-- Stub auth.users. Three migrations reference it, all of them as the target of
-- a foreign key on an id column, so the primary key is the entire contract; the
-- rehearsal loads ids into it and nothing else. That the emails stay out of the
-- scratch database is a side benefit, not the reason — the reason is that a
-- wider stub would be a second, drifting definition of a table Supabase owns.
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY
);

-- auth.uid() the way PostgREST actually supplies it: the `sub` claim out of the
-- request.jwt.claims setting. Policies restored from the dump therefore behave
-- here as they do in production — SET request.jwt.claims makes them testable,
-- and with no setting at all uid() is null, which is the anonymous case.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    SELECT nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

-- The three roles that policies and grants name. CREATE ROLE has no IF NOT
-- EXISTS, hence the exception handler.
DO $$
BEGIN
    CREATE ROLE anon NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- The migration ledger. Not auth, but the same category of thing: a schema the
-- hosted project creates for us that a bare PostgreSQL has never heard of. The
-- rehearsal restores its rows from the dump and appends to it, so it knows
-- which migrations the restored database has already seen.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
