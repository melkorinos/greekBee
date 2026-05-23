// useConnectionsScoreSubmission.test.ts — unit tests for the Connections score-posting hook.
//
// fetch is mocked per-test via vi.spyOn.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useConnectionsScoreSubmission } from "@/hooks/useConnectionsScoreSubmission";

afterEach(() => vi.restoreAllMocks());

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  } as Response);
}

const BASE = {
  puzzleDate:  "2026-05-22",
  deviceId:    "device-abc",
  displayName: "Νίκος",
};

describe("useConnectionsScoreSubmission — submit()", () => {
  it("POSTs to /api/game-scores with correct fields", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useConnectionsScoreSubmission(BASE));

    await act(async () => { result.current.submit(3); });

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/game-scores");
    const body = JSON.parse(init.body as string);
    expect(body.game_id).toBe("leksindeseis");
    expect(body.puzzle_date).toBe("2026-05-22");
    expect(body.device_id).toBe("device-abc");
    expect(body.display_name).toBe("Νίκος");
    expect(body.score).toBe(3);
  });

  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() =>
      useConnectionsScoreSubmission({ ...BASE, deviceId: "" })
    );

    await act(async () => { result.current.submit(4); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when score is 0", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useConnectionsScoreSubmission(BASE));

    await act(async () => { result.current.submit(0); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when score does not increase (dedup guard)", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useConnectionsScoreSubmission(BASE));

    await act(async () => { result.current.submit(3); });
    await act(async () => { result.current.submit(3); }); // same score — should be ignored

    expect(spy).toHaveBeenCalledOnce();
  });

  it("falls back to 'Ανώνυμος' when displayName is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() =>
      useConnectionsScoreSubmission({ ...BASE, displayName: "" })
    );

    await act(async () => { result.current.submit(4); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Ανώνυμος");
  });
});

describe("useConnectionsScoreSubmission — submitWithName()", () => {
  it("POSTs with the provided name, bypassing the dedup guard", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useConnectionsScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(4, "Νέος"); });

    expect(spy).toHaveBeenCalledOnce();
    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Νέος");
    expect(body.score).toBe(4);
  });

  it("does not POST when score is 0", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useConnectionsScoreSubmission(BASE));

    await act(async () => { result.current.submitWithName(0, "Νέος"); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() =>
      useConnectionsScoreSubmission({ ...BASE, deviceId: "" })
    );

    await act(async () => { result.current.submitWithName(4, "Νέος"); });

    expect(spy).not.toHaveBeenCalled();
  });
});
