// useLeaderboard.test.ts — unit tests for the polling leaderboard hook.
//
// fetch is mocked per-test via vi.spyOn.
// Fake timers are scoped only to polling tests that need them.

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LeaderboardResponse } from "@/hooks/useLeaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_RESPONSE: LeaderboardResponse = { top20: [], playerRow: null };

const SAMPLE_RESPONSE: LeaderboardResponse = {
  top20: [
    { rank: 1, display_name: "Άννα",  score: 100, isPlayer: false },
    { rank: 2, display_name: "Βάσος", score: 80,  isPlayer: true  },
  ],
  playerRow: null,
};

function mockFetch(data: LeaderboardResponse, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => data,
  } as Response);
}

function mockFetchError() {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));
}

afterEach(() => vi.restoreAllMocks());

// ── Initial fetch ─────────────────────────────────────────────────────────────

describe("useLeaderboard — initial fetch", () => {
  it("starts in loading state then resolves data", async () => {
    mockFetch(SAMPLE_RESPONSE);

    const { result } = renderHook(() =>
      useLeaderboard("2026-05-18", "device-1", true)
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.top20).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch throws", async () => {
    mockFetchError();

    const { result } = renderHook(() =>
      useLeaderboard("2026-05-18", "device-1", true)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Network down");
    expect(result.current.data.top20).toHaveLength(0);
  });

  it("does not fetch when enabled is false", () => {
    const spy = vi.spyOn(globalThis, "fetch");

    renderHook(() => useLeaderboard("2026-05-18", "device-1", false));

    expect(spy).not.toHaveBeenCalled();
  });

  it("passes puzzleId and deviceId as query params", async () => {
    const spy = mockFetch(SAMPLE_RESPONSE);

    renderHook(() => useLeaderboard("2026-05-18", "device-abc", true));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    const [url] = spy.mock.calls[0] as [string];
    expect(url).toContain("puzzleId=2026-05-18");
    expect(url).toContain("deviceId=device-abc");
  });

  it("does not include deviceId param when deviceId is empty", async () => {
    const spy = mockFetch(EMPTY_RESPONSE);

    renderHook(() => useLeaderboard("2026-05-18", "", true));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    const [url] = spy.mock.calls[0] as [string];
    expect(url).not.toContain("deviceId");
  });
});

// ── enabled flag ──────────────────────────────────────────────────────────────

describe("useLeaderboard — enabled flag", () => {
  it("clears data when disabled after having loaded data", async () => {
    mockFetch(SAMPLE_RESPONSE);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLeaderboard("2026-05-18", "device-1", enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.data.top20).toHaveLength(2));

    rerender({ enabled: false });

    expect(result.current.data.top20).toHaveLength(0);
  });

  it("re-fetches when enabled switches from false to true", async () => {
    const spy = mockFetch(SAMPLE_RESPONSE);

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLeaderboard("2026-05-18", "device-1", enabled),
      { initialProps: { enabled: false } }
    );

    expect(spy).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
  });
});

// ── Polling (fake timers scoped to this describe) ─────────────────────────────

describe("useLeaderboard — polling", () => {
  afterEach(() => {
    vi.useRealTimers();
    // Restore visibility
    Object.defineProperty(document, "visibilityState", {
      value: "visible", writable: true, configurable: true,
    });
  });

  it("re-fetches after 5 minutes when tab is visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, "visibilityState", {
      value: "visible", writable: true, configurable: true,
    });
    const spy = mockFetch(SAMPLE_RESPONSE);

    renderHook(() => useLeaderboard("2026-05-18", "device-1", true));

    // Initial fetch
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());

    // Advance 5 minutes to trigger poll
    await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000); });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it("does not re-fetch when tab is hidden during poll tick", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden", writable: true, configurable: true,
    });
    const spy = mockFetch(SAMPLE_RESPONSE);

    renderHook(() => useLeaderboard("2026-05-18", "device-1", true));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());

    await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000); });

    // Still only 1 — tab was hidden during the poll tick
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when visibilitychange fires and tab becomes visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden", writable: true, configurable: true,
    });
    const spy = mockFetch(SAMPLE_RESPONSE);

    renderHook(() => useLeaderboard("2026-05-18", "device-1", true));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible", writable: true, configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});

// ── manual refresh ─────────────────────────────────────────────────────────────

describe("useLeaderboard — manual refresh", () => {
  it("refresh() triggers a new fetch immediately", async () => {
    const spy = mockFetch(SAMPLE_RESPONSE);

    const { result } = renderHook(() =>
      useLeaderboard("2026-05-18", "device-1", true)
    );

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());

    await act(async () => { await result.current.refresh(); });

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ── custom buildUrl ────────────────────────────────────────────────────────────

describe("useLeaderboard — custom buildUrl", () => {
  it("calls the custom URL builder instead of the default /api/scores", async () => {
    const spy = mockFetch(SAMPLE_RESPONSE);
    const buildUrl = (puzzleId: string, deviceId: string) =>
      `/api/wordle-scores?date=${puzzleId}&deviceId=${deviceId}`;

    renderHook(() => useLeaderboard("2026-05-18", "device-x", true, buildUrl));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("/api/wordle-scores?date=2026-05-18&deviceId=device-x");
    expect(url).not.toContain("/api/scores");
  });

  it("passes puzzleId and deviceId to the custom builder", async () => {
    const spy = mockFetch(EMPTY_RESPONSE);
    const captured: string[] = [];
    const buildUrl = (puzzleId: string, deviceId: string) => {
      captured.push(puzzleId, deviceId);
      return `/api/custom?date=${puzzleId}`;
    };

    renderHook(() => useLeaderboard("2026-05-20", "device-abc", true, buildUrl));

    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect(captured[0]).toBe("2026-05-20");
    expect(captured[1]).toBe("device-abc");
  });
});


