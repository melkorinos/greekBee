// vitest.config.ts — Vitest configuration for the Leksarxeia platform.
// Uses jsdom so React components can render without a real browser.

import { defineConfig } from "vitest/config";
// `loadEnv` is vite's, not vitest's — vitest/config re-exports defineConfig but
// not this. vite is vitest's own dependency, so this adds nothing to install.
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Load .env / .env.local into the test env the same way `next dev` does.
// Without this nothing put NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY in front of vitest, so the live-DB suites'
// `canRun` gate was false even on a machine holding all three keys — they
// reported as skipped rather than failed, so the gap was invisible.
//
// Why `loadEnv` and not `--env-file-if-exists=.env.local` on the `test`
// script (the way `apply-nominations` does it): that is a node CLI flag, so
// it populates the *parent* process only and leaves the vitest pool workers
// — where tests actually execute — relying on env inheritance. `test.env` is
// forwarded into every worker by vitest itself. It also keeps env policy in
// one place: this block already owns TZ, below.
const fileEnv = loadEnv("test", __dirname, "");

// The live-DB suites' keys are forwarded under LIVE_DB_* names, never their own.
// Under their real names they would be visible to every *mocked* suite too, and a
// mocked suite that renders a component reaching getSupabaseClient() would then
// pass locally and fail only on the runner, where ci.yml withholds all three
// (issue 04 — it cost one CI round trip). Renaming makes the mocked suites see the
// same absent env locally and in CI, so that failure mode cannot hide again. The
// live-DB suites read LIVE_DB_* and stub the canonical names themselves when the
// code under test needs them.
const LIVE_DB_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "LIVE_DB_URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "LIVE_DB_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "LIVE_DB_SERVICE_ROLE_KEY",
};

/** Copy only `keys` that actually have a value — an absent key must stay absent. */
function pickEnv(source: Record<string, string>, keys: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(keys)
      .filter(([from]) => source[from])
      .map(([from, to]) => [to, source[from]]),
  );
}

export default defineConfig({
  plugins: [react()],
  test: {
    // Simulate a browser DOM environment for component tests
    environment: "jsdom",
    // Run the global setup file before every test suite
    setupFiles: ["./src/test/setup.ts"],
    // Make describe/it/expect available without importing them
    globals: true,
    // Exclude Playwright E2E tests — they are run by `playwright test`, not vitest
    exclude: ["e2e/**", "node_modules/**"],
    env: {
      // Only the keys the live-DB suites gate on are forwarded, not all of
      // .env.local — a blanket forward would hand every mocked suite real
      // secrets (ADMIN_SECRET above all) and quietly change what they prove.
      // Absent keys stay absent, so the suites still auto-skip in CI by design.
      ...pickEnv(fileEnv, LIVE_DB_ENV),
      // Pin the clock to the real audience's zone. The suite used to inherit the
      // machine's zone, so date bugs that only bite east of UTC (where Athens is)
      // passed locally on any UTC/CI box and shipped.
      TZ: "Europe/Athens",
    },
  },
  resolve: {
    // Mirror the @/* alias defined in tsconfig so imports work in tests too
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
