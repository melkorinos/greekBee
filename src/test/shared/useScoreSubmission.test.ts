// useScoreSubmission.test.ts — unit tests for the unified score-posting hook.
// Covers both Leksokipos and Leksindeseis game modes.
//
// fetch is mocked per-test via vi.spyOn.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScoreSubmission } from "@/hooks/useScoreSubmission";

afterEach(() => vi.restoreAllMocks());

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
