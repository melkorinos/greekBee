# Unit tests have never run in CI — only Playwright does

Status: needs-triage

## What's missing

`.github/workflows/e2e.yml` is the **only** workflow, and it runs exactly three things: `npm ci`, `npm run build`, and `npx playwright test`. **Nothing invokes `npm run test`** (vitest), and nothing invokes `npx eslint .`.

So the ~1730 unit tests across ~136 files — the bulk of this project's test surface — are green only when someone runs them on their laptop. A PR can merge with every one of them failing. Same for lint.

## Why this matters more than it looks

It **silently weakens every test-shaped guard anyone proposes from here on**, and it does so invisibly — the reasonable assumption is that a committed test runs in CI, and here that assumption is false.

This surfaced during the typed-client work (ADR 0017). A drift-guard test was proposed and defended on the grounds that it would "run free in CI." It would not have. The premise was false, and the guard was rejected on those grounds. That is one near-miss where the CI gap nearly bought a fragile ~SQL-parsing test that would never have fired where it was claimed to. The next proposal may not get checked.

It also **blocks the deferred drift guard in ADR 0017**, which lists "a CI job that runs vitest" as one of its two prerequisites.

## Pending work

- [ ] **Add a vitest job** (or a step on the existing workflow) running `npm run test -- --run`.
- [ ] **Add `npx eslint .`** — also never runs in CI today.
- [ ] **Decide what to do about `npx tsc --noEmit`.** It has a pre-existing baseline of **24 errors across 6 `src/test/*` files**, so it cannot simply be added as a gate — either fix the baseline first or the job is red from day one. Fixing it is probably the right call; it is confined to test files.

## Notes

- The live-DB tests (`rlsInvariantsLiveDb`, `cleanupScoresLiveDb`) are `describe.skipIf(!canRun)`-gated on env vars, so they will **auto-skip in CI** unless the secrets are added. That is fine and by design — but it means a CI vitest job guards the mocked suite, not the live-DB invariants.
- **They also skip *locally*, which is not by design — they have never run anywhere.** Verified 2026-07-16: nothing loads `.env.local` into vitest (no dotenv in `vitest.config.ts`, no `--env-file` on the `test` script), so `canRun` is false even on a machine with all three keys present. The suites report as skipped, not failed, so this has been invisible. Getting them to run means exporting the env into the shell first — which is how the `community_stavrolekso_puzzles` posture was actually verified when the silent-edit bug was fixed.
- Consequence: **every live-DB "lock" committed so far is inert**, including the `game_scores` RLS matrix and the new community-table posture. Any future ticket that proposes a live-DB regression test (e.g. issue 04) inherits this — the test will pass by skipping. Worth fixing here, via `--env-file-if-exists=.env.local` on the `test` script (matching what `apply-nominations` already does in `package.json`) or a dotenv load in `vitest.config.ts`. It changes how tests run for everyone, so it wants a deliberate call rather than a drive-by.
- The workflow already wires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from repo secrets for the build step, so the pattern for adding secrets is established.
- Not urgent pre-launch. Worth doing before the test suite is trusted as a merge gate.

## References

- `.github/workflows/e2e.yml` — the only workflow
- `docs/adr/0017-generated-schema-types-on-the-client.md` — rejects a drift guard on this basis; defers another one pending this ticket
