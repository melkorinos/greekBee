// useProfile.test.ts — unit tests for the shared cross-device profile hook.
// Covers the four flows: createProfile, generateTransferCode, claimTransferCode,
// disconnect — and their store/localStorage side effects.
//
// fetch is mocked per-test; the useGameStore module is mocked so the tests
// assert the hook's wiring, not the envelope implementation (covered by
// useGameStore.test.ts).

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProfile } from "@/hooks/useProfile";
import * as store from "@/hooks/useGameStore";
import * as reload from "@/lib/reload";

vi.mock("@/lib/reload", () => ({
  reloadApp: vi.fn(),
}));

// createProfile reads the current session to attach a Bearer token for RLS.
// Default: no session (anonymous) — a test overrides it to assert the auth path.
const supa = vi.hoisted(() => ({ session: null as { access_token: string } | null }));
vi.mock("@/lib/supabase", async () => ({
  table: (await import("@/test/helpers/supabaseMock")).tableShim,
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: supa.session } }) },
  }),
}));

vi.mock("@/hooks/useGameStore", () => ({
  disconnectIdentity:  vi.fn(),
  getOrCreateDeviceId: vi.fn(() => "fresh-device-id"),
  isProfileLinked:     vi.fn(() => false),
  setDeviceId:         vi.fn(),
  setDisplayName:      vi.fn(),
  setProfileLinked:    vi.fn(),
}));

function mockFetch(response: { ok: boolean; body?: unknown }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   response.ok,
    json: async () => response.body ?? {},
  } as Response);
}

const OPTS = {
  deviceId:            "device-abc",
  onDeviceIdChange:    vi.fn(),
  onDisplayNameChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  supa.session = null;
  // clearAllMocks keeps stubbed return values — re-pin the defaults so a
  // mockReturnValue from one test never leaks into the next.
  vi.mocked(store.isProfileLinked).mockReturnValue(false);
  vi.mocked(store.getOrCreateDeviceId).mockReturnValue("fresh-device-id");
});
afterEach(() => vi.restoreAllMocks());

// ── initial state ─────────────────────────────────────────────────────────────

describe("useProfile — initial state", () => {
  it("profileLinked reflects the stored envelope flag", () => {
    vi.mocked(store.isProfileLinked).mockReturnValue(true);
    const { result } = renderHook(() => useProfile(OPTS));
    expect(result.current.profileLinked).toBe(true);
  });
});

// ── createProfile ─────────────────────────────────────────────────────────────

describe("useProfile — createProfile", () => {
  it("POSTs name + device_uuid and marks the profile linked", async () => {
    const spy = mockFetch({ ok: true });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.createProfile("Άννα"); });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/profile");
    expect(JSON.parse(init.body as string)).toEqual({
      display_name: "Άννα",
      device_uuid:  "device-abc",
    });
    expect(store.setDisplayName).toHaveBeenCalledWith("Άννα");
    expect(OPTS.onDisplayNameChange).toHaveBeenCalledWith("Άννα");
    expect(store.setProfileLinked).toHaveBeenCalledWith(true);
    expect(result.current.profileLinked).toBe(true);
  });

  it("omits the Authorization header when there is no session (anonymous)", async () => {
    const spy = mockFetch({ ok: true });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.createProfile("Άννα"); });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("attaches the session Bearer token so RLS accepts an auth-linked profile write", async () => {
    supa.session = { access_token: "tok-xyz" };
    const spy = mockFetch({ ok: true });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.createProfile("Άννα"); });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-xyz");
  });

  it("falls back to Ανώνυμος for a blank name", async () => {
    mockFetch({ ok: true });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.createProfile("   "); });

    expect(store.setDisplayName).toHaveBeenCalledWith("Ανώνυμος");
  });

  it("throws on a failed response and leaves the profile unlinked", async () => {
    mockFetch({ ok: false });
    const { result } = renderHook(() => useProfile(OPTS));

    await expect(
      act(async () => { await result.current.createProfile("Άννα"); }),
    ).rejects.toThrow(/profile create failed/);
    expect(store.setProfileLinked).not.toHaveBeenCalled();
    expect(result.current.profileLinked).toBe(false);
  });
});

// ── generateTransferCode ──────────────────────────────────────────────────────

describe("useProfile — generateTransferCode", () => {
  it("POSTs the device uuid and returns the code", async () => {
    const spy = mockFetch({ ok: true, body: { code: "ABC123" } });
    const { result } = renderHook(() => useProfile(OPTS));

    let code = "";
    await act(async () => { code = await result.current.generateTransferCode(); });

    expect(code).toBe("ABC123");
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/transfer");
    expect(JSON.parse(init.body as string)).toEqual({ device_uuid: "device-abc" });
  });

  it("throws on a failed response", async () => {
    mockFetch({ ok: false });
    const { result } = renderHook(() => useProfile(OPTS));

    await expect(
      act(async () => { await result.current.generateTransferCode(); }),
    ).rejects.toThrow(/transfer code generation failed/);
  });
});

// ── claimTransferCode ─────────────────────────────────────────────────────────

describe("useProfile — claimTransferCode", () => {
  it("adopts the source device id + name and flags a leksokipos restore", async () => {
    mockFetch({ ok: true, body: { device_uuid: "source-uuid", display_name: "Νίκος" } });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.claimTransferCode("ABC123"); });

    expect(store.setDeviceId).toHaveBeenCalledWith("source-uuid");
    expect(OPTS.onDeviceIdChange).toHaveBeenCalledWith("source-uuid");
    expect(store.setDisplayName).toHaveBeenCalledWith("Νίκος");
    expect(OPTS.onDisplayNameChange).toHaveBeenCalledWith("Νίκος");
    expect(result.current.profileLinked).toBe(true);
    expect(localStorage.getItem("leksokipos-needs-restore")).toBe("true");
  });

  it("does not overwrite the display name when the claim returns none", async () => {
    mockFetch({ ok: true, body: { device_uuid: "source-uuid", display_name: "" } });
    const { result } = renderHook(() => useProfile(OPTS));

    await act(async () => { await result.current.claimTransferCode("ABC123"); });

    expect(store.setDisplayName).not.toHaveBeenCalled();
    expect(OPTS.onDisplayNameChange).not.toHaveBeenCalled();
  });

  it("surfaces the server's error message on failure", async () => {
    mockFetch({ ok: false, body: { error: "code expired" } });
    const { result } = renderHook(() => useProfile(OPTS));

    await expect(
      act(async () => { await result.current.claimTransferCode("STALE1"); }),
    ).rejects.toThrow("code expired");
    expect(store.setDeviceId).not.toHaveBeenCalled();
  });
});

// ── disconnect ────────────────────────────────────────────────────────────────

describe("useProfile — disconnect", () => {
  it("clears the store link and hands the caller a fresh device id", () => {
    vi.mocked(store.isProfileLinked).mockReturnValue(true);
    const { result } = renderHook(() => useProfile(OPTS));
    expect(result.current.profileLinked).toBe(true);

    act(() => { result.current.disconnect(); });

    expect(store.disconnectIdentity).toHaveBeenCalled();
    expect(OPTS.onDeviceIdChange).toHaveBeenCalledWith("fresh-device-id");
    expect(OPTS.onDisplayNameChange).toHaveBeenCalledWith("");
    expect(result.current.profileLinked).toBe(false);
  });

  it("hard-reloads after the reset — in-memory game sessions must not survive Disconnect", () => {
    const { result } = renderHook(() => useProfile(OPTS));
    act(() => { result.current.disconnect(); });

    expect(reload.reloadApp).toHaveBeenCalledTimes(1);
    // The envelope reset must land before the reload, or the old identity survives it.
    expect(vi.mocked(store.disconnectIdentity).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(reload.reloadApp).mock.invocationCallOrder[0]!);
  });
});
