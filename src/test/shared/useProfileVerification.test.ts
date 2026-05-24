// useProfileVerification.test.ts
// Verifies the startup auto-heal: if profileLinked=true but the profile row
// no longer exists in DB, the hook calls onDisconnect() silently.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useProfileVerification } from "@/hooks/useProfileVerification";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useProfileVerification — not linked", () => {
  it("makes no fetch call when profileLinked is false", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const onDisconnect = vi.fn();

    renderHook(() => useProfileVerification({ profileLinked: false, deviceId: "uuid-abc", onDisconnect }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it("makes no fetch call when deviceId is empty", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const onDisconnect = vi.fn();

    renderHook(() => useProfileVerification({ profileLinked: true, deviceId: "", onDisconnect }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});

describe("useProfileVerification — linked, profile exists", () => {
  it("does NOT call onDisconnect when the profile is found in DB", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ exists: true }), { status: 200 })
    );
    const onDisconnect = vi.fn();

    renderHook(() =>
      useProfileVerification({ profileLinked: true, deviceId: "uuid-ok", onDisconnect })
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});

describe("useProfileVerification — linked, profile deleted", () => {
  it("calls onDisconnect when the profile row is gone (exists:false)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ exists: false }), { status: 200 })
    );
    const onDisconnect = vi.fn();

    renderHook(() =>
      useProfileVerification({ profileLinked: true, deviceId: "uuid-gone", onDisconnect })
    );

    await waitFor(() => expect(onDisconnect).toHaveBeenCalledOnce());
  });

  it("does NOT call onDisconnect when the API returns a server error (assume still linked)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "DB error" }), { status: 500 })
    );
    const onDisconnect = vi.fn();

    renderHook(() =>
      useProfileVerification({ profileLinked: true, deviceId: "uuid-err", onDisconnect })
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it("does NOT call onDisconnect when fetch throws (offline — do not log out offline users)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    const onDisconnect = vi.fn();

    renderHook(() =>
      useProfileVerification({ profileLinked: true, deviceId: "uuid-net", onDisconnect })
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(onDisconnect).not.toHaveBeenCalled();
  });
});
