// supabase.test.ts — unit tests for the Supabase client singleton.
// Verifies the error path when env vars are missing.
// The happy path (valid env vars → real client created) is not tested here
// because it would require a live Supabase project in CI.

import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

// createClient is mocked so the auth helpers can be exercised without a live
// project. getSupabaseClient's env-var guard runs *before* createClient, so the
// error-path tests below are unaffected by the mock.
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

// We need to reset the module between tests so the singleton _client is cleared.
// Vitest's vi.resetModules() + dynamic import achieves this.

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.mocked(createClient).mockReset();
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

  // Regression: /auth/callback reads ?code= and calls exchangeCodeForSession —
  // that only exists in the PKCE flow. The library default (implicit) returns
  // tokens in the URL hash, so the callback finds no code. detectSessionInUrl
  // must be off so the callback stays the sole code-exchanger.
  it("creates the client in the PKCE flow with auto URL detection disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "some-key");
    vi.mocked(createClient).mockReturnValue({} as never);

    const { getSupabaseClient } = await import("@/lib/supabase");
    getSupabaseClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "some-key",
      expect.objectContaining({
        auth: expect.objectContaining({ flowType: "pkce", detectSessionInUrl: false }),
      }),
    );
  });
});

describe("signInWithGoogle", () => {
  function stubEnv() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "some-key");
  }

  // Regression: signInWithOAuth returns { error } rather than throwing; the old
  // code awaited it and dropped the error, leaving the sign-in button dead with
  // no feedback. The helper must now propagate so callers can surface it.
  it("throws when signInWithOAuth returns an error", async () => {
    stubEnv();
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: new Error("boom") });
    vi.mocked(createClient).mockReturnValue({ auth: { signInWithOAuth } } as never);

    const { signInWithGoogle } = await import("@/lib/supabase");
    await expect(signInWithGoogle()).rejects.toThrow("boom");
  });

  it("resolves and requests the google provider when signInWithOAuth succeeds", async () => {
    stubEnv();
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: "https://x" }, error: null });
    vi.mocked(createClient).mockReturnValue({ auth: { signInWithOAuth } } as never);

    const { signInWithGoogle } = await import("@/lib/supabase");
    await expect(signInWithGoogle()).resolves.toBeUndefined();
    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });
});
