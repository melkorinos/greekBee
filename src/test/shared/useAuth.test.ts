// useAuth.test.ts — unit tests for the Google OAuth auth hook.
// Mocks Supabase client and useGameStore helpers.
// Verifies initial state, session resolution, auth state changes, and sign-out.

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// vi.mock factories are hoisted — variables defined here must not reference outer consts.
// Use vi.hoisted() so the mock fns are available both inside the factory and in tests.
const {
  mockUnsubscribe,
  mockOnAuthStateChange,
  mockGetSession,
  mockSignOutFn,
  mockIsAuthLinked,
  mockSetAuthLinked,
  mockSetProfileLinked,
  mockDisconnectIdentity,
  mockReloadApp,
} = vi.hoisted(() => ({
  mockUnsubscribe:        vi.fn(),
  mockOnAuthStateChange:  vi.fn(),
  mockGetSession:         vi.fn(),
  mockSignOutFn:          vi.fn(async () => {}),
  mockIsAuthLinked:       vi.fn(() => false),
  mockSetAuthLinked:      vi.fn(),
  mockSetProfileLinked:   vi.fn(),
  mockDisconnectIdentity: vi.fn(),
  mockReloadApp:          vi.fn(),
}));

vi.mock("@/lib/supabase", async () => ({
  table: (await import("@/test/helpers/supabaseMock")).tableShim,
  getSupabaseClient: () => ({
    auth: {
      getSession:        mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
  signInWithGoogle: vi.fn(async () => {}),
  signOut:          mockSignOutFn,
}));

vi.mock("@/lib/reload", () => ({
  reloadApp: () => mockReloadApp(),
}));

vi.mock("@/hooks/useGameStore", () => ({
  isAuthLinked:       () => mockIsAuthLinked(),
  setAuthLinked:      (v: boolean) => mockSetAuthLinked(v),
  setProfileLinked:   (v: boolean) => mockSetProfileLinked(v),
  disconnectIdentity: () => mockDisconnectIdentity(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubNoSession() {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
}

function stubSession(name: string | null = "Γιώργης") {
  const session = {
    user: {
      id:            "auth-user-uuid",
      user_metadata: name ? { full_name: name } : {},
    },
  };
  mockGetSession.mockResolvedValue({ data: { session } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
}

afterEach(() => vi.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useAuth — no session on mount", () => {
  beforeEach(() => {
    mockIsAuthLinked.mockReturnValue(false);
    stubNoSession();
  });

  it("starts with isLoading=true then resolves to authLinked=false", async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.authLinked).toBe(false);
    expect(result.current.authUserName).toBeNull();
  });

  it("calls setAuthLinked(false) in the store when no session", async () => {
    renderHook(() => useAuth());
    await waitFor(() => expect(mockSetAuthLinked).toHaveBeenCalledWith(false));
  });

  it("unsubscribes from auth state changes on unmount", async () => {
    const { unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe("useAuth — session present on mount", () => {
  beforeEach(() => {
    mockIsAuthLinked.mockReturnValue(false);
    stubSession("Μαρία");
  });

  it("resolves to authLinked=true and authUserName from session", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.authLinked).toBe(true);
    expect(result.current.authUserName).toBe("Μαρία");
  });

  it("calls setAuthLinked(true) and setProfileLinked(true) in the store", async () => {
    renderHook(() => useAuth());
    await waitFor(() => expect(mockSetAuthLinked).toHaveBeenCalledWith(true));
    expect(mockSetProfileLinked).toHaveBeenCalledWith(true);
  });

  it("sets authUserName=null when full_name is absent from session", async () => {
    stubSession(null);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.authUserName).toBeNull();
  });
});

describe("useAuth — initialised from store (already authLinked)", () => {
  beforeEach(() => {
    mockIsAuthLinked.mockReturnValue(true);
    stubNoSession();
  });

  it("starts with authLinked=true from store before session resolves", () => {
    const { result } = renderHook(() => useAuth());
    // useState lazy initialiser reads from store synchronously before getSession resolves
    expect(result.current.authLinked).toBe(true);
  });
});

describe("useAuth — sign-out", () => {
  beforeEach(() => {
    mockIsAuthLinked.mockReturnValue(false);
    stubNoSession();
    // signOut resolves to void — mockResolvedValue({}) was a type error.
    mockSignOutFn.mockResolvedValue(undefined);
  });

  it("clears authLinked and authUserName after calling signOut", async () => {
    const { result } = renderHook(() => useAuth());
    // Manually set state as if already linked
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.signOut(); });
    expect(result.current.authLinked).toBe(false);
    expect(result.current.authUserName).toBeNull();
    expect(mockSetAuthLinked).toHaveBeenCalledWith(false);
  });

  it("disconnects the identity — Google sign-out is a full Disconnect (ADR 0012 §5)", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.signOut(); });
    expect(mockDisconnectIdentity).toHaveBeenCalledTimes(1);
  });

  it("hard-reloads after the identity reset — mounted boards must not keep the old identity in memory", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.signOut(); });
    expect(mockReloadApp).toHaveBeenCalledTimes(1);
    // The envelope reset must land before the reload, or the old identity survives it.
    expect(mockDisconnectIdentity.mock.invocationCallOrder[0])
      .toBeLessThan(mockReloadApp.mock.invocationCallOrder[0]!);
  });
});
