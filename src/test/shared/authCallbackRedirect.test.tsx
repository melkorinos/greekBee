// authCallbackRedirect.test.tsx — /auth/callback destination routing.
//
// After exchanging the OAuth code and linking the device, the callback decides
// where to send the player. Sign-in Restore (restored:true) lands them on
// /profile — the proof surface (adopted name, merged stats, trophy case).
// A normal sign-in returns to the saved origin page. Either way the saved
// auth-redirect key is cleared.

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockReplace, mockExchange, mockAdopt } = vi.hoisted(() => ({
  mockReplace:  vi.fn(),
  mockExchange: vi.fn(),
  mockAdopt:    vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { exchangeCodeForSession: mockExchange },
  }),
}));

vi.mock("@/hooks/useGameStore", () => ({
  adoptDeviceIdentity: (...args: unknown[]) => mockAdopt(...args),
  getOrCreateDeviceId: () => "device-A",
}));

import AuthCallbackPage from "@/app/auth/callback/page";

function stubSession() {
  mockExchange.mockResolvedValue({
    data: { session: { user: { id: "auth-B" }, access_token: "jwt-token" } },
    error: null,
  });
}

function stubLinkResponse(body: Record<string, unknown>) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   true,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  window.history.replaceState({}, "", "/auth/callback?code=pkce123");
  sessionStorage.setItem("auth-redirect", "/leksokipos");
  stubSession();
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("/auth/callback redirect destination", () => {
  it("routes a restored sign-in to /profile and clears the saved redirect", async () => {
    stubLinkResponse({ device_uuid: "canonical-B", display_name: "Νίκος", restored: true });

    render(<AuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile"));
    expect(sessionStorage.getItem("auth-redirect")).toBeNull();
  });

  it("routes a normal (non-restored) sign-in back to the saved origin page", async () => {
    stubLinkResponse({ device_uuid: "device-A", display_name: "Νίκος", restored: false });

    render(<AuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/leksokipos"));
    expect(sessionStorage.getItem("auth-redirect")).toBeNull();
  });
});
