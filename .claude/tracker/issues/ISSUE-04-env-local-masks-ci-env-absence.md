# A local `.env.local` hides Supabase-env failures until CI runs them

**Deferred:** 2026-08-12
**Revisit when:** a second unit test fails in CI while passing locally for this reason — or when the
live-DB suites are next touched, since fixing this properly means changing how they gate.

## Problem

`vitest.config.ts` forwards `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` from `.env.local` into every vitest worker, so the live-DB suites can
gate on them. `ci.yml` deliberately withholds all three. That difference is not visible anywhere:
the local suite and the CI suite run *different environments* under the same command.

`getSupabaseClient()` throws when the two `NEXT_PUBLIC_` vars are absent. So any test that renders a
component reaching `useAuth` without stubbing it passes on the developer's machine and fails only on
the runner. It has already happened once: `registryCoverage.test.tsx` renders `app/page.tsx`, whose
cards render `HomeTrophyButton` → `usePlayerIdentity` → `useAuth`. Two tests went red on CI
(run 31633063085) with a full React effect stack trace and no local reproduction.

The workaround for reproducing it is worth writing down, because it is not obvious: create
`.env.test.local` setting all three keys to the empty string. `loadEnv` gives that file the highest
precedence and `pickEnv` drops empty values, so the keys end up genuinely absent — a faithful CI
environment. Delete the file afterwards.

## Why deferred

The immediate failure is fixed by stubbing the hook in the one offending file, which is what the
board suites already do. The class of bug is not fixed: the next component that reads identity and
gets rendered in an unstubbed test will fail the same way, and again only in CI.

The real fix is to stop the mocked suites from ever seeing real Supabase keys — forward them to the
live-DB suites under different names (`LIVE_DB_*`) and have those suites set `process.env` themselves
before constructing a client. Then a local run and a CI run see the same absent env, and this failure
mode disappears rather than being caught later. That touches `vitest.config.ts`,
`rlsInvariantsLiveDb.test.ts` and `cleanupScoresLiveDb.test.ts` — the developer's pre-push safety
net — for a bug that has cost one CI round trip so far. Not worth doing on the way to launch.
