// useGameIdentity.test.ts — unit tests for the SSR-safe identity initialisation hook.
// Tests run in jsdom (window is defined), so the SSR guard returns the store values.

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGameIdentity } from "@/hooks/useGameIdentity";
import { setDisplayName, writeSlice } from "@/hooks/useGameStore";

// setup.ts calls localStorage.clear() before each test — no extra cleanup needed.

describe("useGameIdentity — initial values", () => {
  it("returns a non-empty deviceId on first mount (creates one if absent)", () => {
    const { result } = renderHook(() => useGameIdentity());
    expect(result.current.deviceId).not.toBe("");
    expect(result.current.deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns the same deviceId on re-render (stable UUID)", () => {
    const { result, rerender } = renderHook(() => useGameIdentity());
    const first = result.current.deviceId;
    rerender();
    expect(result.current.deviceId).toBe(first);
  });

  it("returns empty displayName when none has been saved", () => {
    const { result } = renderHook(() => useGameIdentity());
    expect(result.current.displayName).toBe("");
  });

  it("returns a pre-saved displayName from the store", () => {
    setDisplayName("Νίκος");
    const { result } = renderHook(() => useGameIdentity());
    expect(result.current.displayName).toBe("Νίκος");
  });

  it("returns a pre-seeded deviceId from the store", () => {
    const knownId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    // Seed via writeSlice (mimics what getOrCreateDeviceId would store)
    writeSlice("leksokipos", {}); // ensure envelope exists
    localStorage.setItem(
      "wordgames:state",
      JSON.stringify({ deviceId: knownId }),
    );
    const { result } = renderHook(() => useGameIdentity());
    expect(result.current.deviceId).toBe(knownId);
  });
});

describe("useGameIdentity — setters", () => {
  it("setDeviceId updates deviceId in state", () => {
    const { result } = renderHook(() => useGameIdentity());
    act(() => { result.current.setDeviceId("new-device-id"); });
    expect(result.current.deviceId).toBe("new-device-id");
  });

  it("setDisplayName updates displayName in state", () => {
    const { result } = renderHook(() => useGameIdentity());
    act(() => { result.current.setDisplayName("Μαρία"); });
    expect(result.current.displayName).toBe("Μαρία");
  });

  it("setDeviceId does not affect displayName", () => {
    setDisplayName("Άννα");
    const { result } = renderHook(() => useGameIdentity());
    act(() => { result.current.setDeviceId("some-id"); });
    expect(result.current.displayName).toBe("Άννα");
  });

  it("setDisplayName does not affect deviceId", () => {
    const { result } = renderHook(() => useGameIdentity());
    const original = result.current.deviceId;
    act(() => { result.current.setDisplayName("Κώστας"); });
    expect(result.current.deviceId).toBe(original);
  });
});
