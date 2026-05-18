// supabase.test.ts — unit tests for the Supabase client singleton.
// Verifies the error path when env vars are missing.
// The happy path (valid env vars → real client created) is not tested here
// because it would require a live Supabase project in CI.

import { afterEach, describe, expect, it, vi } from "vitest";

// We need to reset the module between tests so the singleton _client is cleared.
// Vitest's vi.resetModules() + dynamic import achieves this.

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("getSupabaseClient", () => {
  it("throws a clear error when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "some-key");

    const { getSupabaseClient } = await import("@/lib/supabase");
    expect(() => getSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws a clear error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { getSupabaseClient } = await import("@/lib/supabase");
    expect(() => getSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws when both env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { getSupabaseClient } = await import("@/lib/supabase");
    expect(() => getSupabaseClient()).toThrow(/Missing Supabase env vars/);
  });
});
