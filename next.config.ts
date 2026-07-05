import { PHASE_PRODUCTION_BUILD } from "next/constants";

import type { NextConfig } from "next";

// NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so a
// missing/empty value can't be recovered at runtime — it silently ships a broken
// Supabase client. That once turned a missing CI secret into a confusing batch of
// e2e timeouts (see .claude/handoffs/e2e-tests-handoff.md). Fail the production
// build loudly instead, naming exactly which var is empty.
//
// Only enforced during `next build` (production/CI). `next dev` is left alone so
// contributors can boot the dev server without every secret configured.
const REQUIRED_BUILD_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function assertRequiredBuildEnv(): void {
  const missing = REQUIRED_BUILD_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required build-time env var(s): ${missing.join(", ")}.\n` +
        "These are inlined into the client bundle at build time; an empty value ships a broken app.\n" +
        "Locally: add them to .env.local. In CI: set them as GitHub Actions repository secrets.",
    );
  }
}

const nextConfig: NextConfig = {
  // Hides the Next.js "N" dev tools badge in the bottom-left corner during development
  devIndicators: false,
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) assertRequiredBuildEnv();
  return nextConfig;
}
