// usePlayerIdentity.test.ts — the single identity module behind every
// leaderboard-bearing surface. These tests assert the module's OWN composition:
//   • the legacy migration runs before the device id is read (ordering constraint);
//   • the scalar identity fields reflect the store;
//   • `leaderboardProps` is the complete, correctly-wired modal bundle;
//   • `saveName` persists to the store.
// The underlying hooks (useProfile / useAuth / useGameIdentity) have their own suites.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import * as store from "@/hooks/useGameStore";

vi.mock("@/lib/reload", () => ({ reloadApp: vi.fn() }));

// useAuth + useProfile both read the Supabase session; useAuth also subscribes.
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession:        async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
  signInWithGoogle: vi.fn(),
  signOut:          vi.fn(),
}));

vi.mock("@/hooks/useGameStore", () => ({
  migrateLeksiarxeioIdentity: vi.fn(),
  getOrCreateDeviceId:        vi.fn(() => "device-abc"),
  getDisplayName:             vi.fn(() => "Άννα"),
  setDisplayName:             vi.fn(),
  setDeviceId:                vi.fn(),
  setProfileLinked:           vi.fn(),
  setAuthLinked:              vi.fn(),
  isProfileLinked:            vi.fn(() => false),
  isAuthLinked:               vi.fn(() => false),
  disconnectIdentity:         vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(store.getOrCreateDeviceId).mockReturnValue("device-abc");
  vi.mocked(store.getDisplayName).mockReturnValue("Άννα");
  vi.mocked(store.isProfileLinked).mockReturnValue(false);
  vi.mocked(store.isAuthLinked).mockReturnValue(false);
});
afterEach(() => vi.restoreAllMocks());

// ── migration ordering ──────────────────────────────────────────────────────────

describe("usePlayerIdentity — legacy migration", () => {
  it("runs migrateLeksiarxeioIdentity BEFORE the device id is read", () => {
    renderHook(() => usePlayerIdentity());

    expect(store.migrateLeksiarxeioIdentity).toHaveBeenCalled();
    // The whole point of owning migration here: it must promote a legacy UUID
    // before getOrCreateDeviceId can mint a fresh one.
    expect(vi.mocked(store.migrateLeksiarxeioIdentity).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(store.getOrCreateDeviceId).mock.invocationCallOrder[0]!);
  });
});

// ── scalar identity ──────────────────────────────────────────────────────────────

describe("usePlayerIdentity — scalar fields", () => {
  it("reflects device id, display name, and the linked flags from the store", () => {
    vi.mocked(store.isProfileLinked).mockReturnValue(true);
    const { result } = renderHook(() => usePlayerIdentity());

    expect(result.current.deviceId).toBe("device-abc");
    expect(result.current.displayName).toBe("Άννα");
    expect(result.current.profileLinked).toBe(true);
  });
});

// ── leaderboard bundle ───────────────────────────────────────────────────────────

describe("usePlayerIdentity — leaderboardProps bundle", () => {
  it("exposes the complete, correctly-wired modal prop set", () => {
    const { result } = renderHook(() => usePlayerIdentity());
    const p = result.current.leaderboardProps;

    // Every prop a game LeaderboardModal needs, in one object.
    expect(Object.keys(p).sort()).toEqual(
      [
        "authLinked", "authUserName", "deviceId", "displayName",
        "onDisconnect", "onProfileCreate", "onSaveName", "onSignIn",
        "onSignOut", "onTransferClaim", "onTransferGenerate", "profileLinked",
      ].sort(),
    );

    expect(p.deviceId).toBe("device-abc");
    expect(p.displayName).toBe("Άννα");
    expect(p.onProfileCreate).toBe(result.current.createProfile);
    expect(p.onTransferGenerate).toBe(result.current.generateTransferCode);
    expect(p.onTransferClaim).toBe(result.current.claimTransferCode);
    expect(p.onDisconnect).toBe(result.current.disconnect);
    expect(p.onSignIn).toBe(result.current.signInWithGoogle);
    expect(p.onSaveName).toBe(result.current.saveName);
  });
});

// ── saveName ─────────────────────────────────────────────────────────────────────

describe("usePlayerIdentity — saveName", () => {
  it("persists a typed name to the unified store", () => {
    const { result } = renderHook(() => usePlayerIdentity());

    act(() => { result.current.saveName("Νίκος"); });

    expect(store.setDisplayName).toHaveBeenCalledWith("Νίκος");
  });
});
