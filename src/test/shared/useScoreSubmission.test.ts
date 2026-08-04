// useScoreSubmission.test.ts — unit tests for the unified score-posting hook.
// Covers both Leksokipos and Leksindeseis game modes.
//
// fetch is mocked per-test via vi.spyOn.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { readOutbox } from "@/lib/offlineOutbox";

// While Offline Mode is active a post would fail silently and lose the Score, so
// submissions are queued to the Offline Score Outbox instead (ADR 0010).
let offlineActive = false;
vi.mock("@/hooks/useOfflineMode", () => ({
  useOfflineMode: () => ({ active: offlineActive }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  offlineActive = false;
});

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  } as Response);
}

const BASE = {
  gameId:      "leksokipos" as const,
  puzzleDate:  "2026-05-20",
  deviceId:    "device-abc",
  displayName: "Άννα",
  enabled:     true,
};

describe("useScoreSubmission — submit()", () => {
  it("POSTs to /api/game-scores with correct fields", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/game-scores");
    const body = JSON.parse(init.body as string);
    expect(body.game_id).toBe("leksokipos");
    expect(body.puzzle_date).toBe("2026-05-20");
    expect(body.device_id).toBe("device-abc");
    expect(body.display_name).toBe("Άννα");
    expect(body.score).toBe(10);
  });

  it("sends game_id leksindeseis when configured for Leksindeseis", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() =>
      useScoreSubmission({ ...BASE, gameId: "leksindeseis", puzzleDate: "2026-05-22" })
    );

    await act(async () => { result.current.submit(4); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.game_id).toBe("leksindeseis");
    expect(body.puzzle_date).toBe("2026-05-22");
  });

  it("does not POST when enabled is false", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, enabled: false }));

    await act(async () => { result.current.submit(10); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("defaults enabled to true when omitted", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({
      gameId:      "leksokipos",
      puzzleDate:  "2026-05-20",
      deviceId:    "device-abc",
      displayName: "Άννα",
      // enabled intentionally omitted — default is true
    }));

    await act(async () => { result.current.submit(10); });

    expect(spy).toHaveBeenCalledOnce();
  });

  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, deviceId: "" }));

    await act(async () => { result.current.submit(10); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when score is 0", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(0); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when score does not increase", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });
    await act(async () => { result.current.submit(10); }); // same score
    await act(async () => { result.current.submit(5); });  // lower score

    expect(spy).toHaveBeenCalledOnce(); // only the first call
  });

  it("POSTs again when score strictly increases", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });
    await act(async () => { result.current.submit(15); });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("includes the data record in the body when provided", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10, { words: 12, pangrams: 2 }); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.data).toEqual({ words: 12, pangrams: 2 });
  });

  it("omits data from the body when not provided", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty("data");
  });

  it("falls back to 'Ανώνυμος' when displayName is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, displayName: "" }));

    await act(async () => { result.current.submit(10); });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.display_name).toBe("Ανώνυμος");
  });

  it("uses the latest displayName via ref without re-creating submit", async () => {
    const spy = mockFetch();
    const { result, rerender } = renderHook(
      (props: { displayName: string }) => useScoreSubmission({ ...BASE, ...props }),
      { initialProps: { displayName: "Παλιό" } },
    );

    const submitBefore = result.current.submit;
    rerender({ displayName: "Νέο" });

    await act(async () => { result.current.submit(10); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Νέο");
    expect(result.current.submit).toBe(submitBefore);
  });
});

describe("useScoreSubmission — submitWithName()", () => {
  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, deviceId: "" }));

    await act(async () => { result.current.submitWithName(10, "Νέος"); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("POSTs with the provided name, bypassing the increase guard", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(10, "Νέος"); });

    expect(spy).toHaveBeenCalledOnce();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.display_name).toBe("Νέος");
    expect(body.score).toBe(10);
  });

  it("forwards the data record when provided", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(10, "Νέος", { words: 8, pangrams: 1 }); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.data).toEqual({ words: 8, pangrams: 1 });
  });

  it("does not POST when score is 0", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(0, "Νέος"); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when enabled is false", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, enabled: false }));

    await act(async () => { result.current.submitWithName(10, "Νέος"); });

    expect(spy).not.toHaveBeenCalled();
  });
});

// ── Offline Mode ────────────────────────────────────────────────────────────

describe("useScoreSubmission — while Offline Mode is active", () => {
  it("queues the Score to the outbox instead of POSTing", async () => {
    offlineActive = true;
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });

    expect(spy).not.toHaveBeenCalled();
    expect(readOutbox()).toEqual([{
      gameId:      "leksokipos",
      puzzleDate:  "2026-05-20",
      deviceId:    "device-abc",
      score:       10,
      displayName: "Άννα",
    }]);
  });

  it("overwrites the queued entry as the Score climbs, keeping only the latest", async () => {
    offlineActive = true;
    mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });
    await act(async () => { result.current.submit(25); });

    const entries = readOutbox();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.score).toBe(25);
  });

  it("queues a name save against the new name", async () => {
    offlineActive = true;
    mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(10, "Νέος"); });

    expect(readOutbox()[0]!.displayName).toBe("Νέος");
  });

  it("queues nothing when posting is disabled — a Custom Puzzle has no leaderboard", async () => {
    offlineActive = true;
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission({ ...BASE, enabled: false }));

    await act(async () => { result.current.submit(10); });

    expect(spy).not.toHaveBeenCalled();
    expect(readOutbox()).toEqual([]);
  });

  it("resumes POSTing once Offline Mode is off", async () => {
    offlineActive = false;
    const spy = mockFetch();
    const { result } = renderHook(() => useScoreSubmission(BASE));

    await act(async () => { result.current.submit(10); });

    expect(spy).toHaveBeenCalledOnce();
    expect(readOutbox()).toEqual([]);
  });
});

describe("useScoreSubmission — the offline/online dedup boundary", () => {
  it("still POSTs the same score after coming back online", async () => {
    // Regression: the strictly-increasing guard is about avoiding duplicate POSTs.
    // A queued-offline score never reached the server, so advancing the guard on it
    // would silently block the real post once the player is back online.
    const spy = mockFetch();
    const { result, rerender } = renderHook(() => useScoreSubmission(BASE));

    offlineActive = true;
    rerender();
    await act(async () => { result.current.submit(10); });
    expect(spy).not.toHaveBeenCalled();

    offlineActive = false;
    rerender();
    await act(async () => { result.current.submit(10); });

    expect(spy).toHaveBeenCalledOnce();
  });
});
