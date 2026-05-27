// useLeksiarxeioScoreSubmission.test.ts — unit tests for the Leksiarxeio score-posting hook.
//
// fetch is mocked per-test via vi.spyOn.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLeksiarxeioScoreSubmission } from "@/hooks/useLeksiarxeioScoreSubmission";

afterEach(() => vi.restoreAllMocks());

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  } as Response);
}

const BASE = {
  puzzleDate:  "2026-05-26",
  deviceId:    "device-abc",
  displayName: "Γιώργος",
};

describe("useLeksiarxeioScoreSubmission — submitLength()", () => {
  it("POSTs to /api/game-scores with correct fields on a win", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useLeksiarxeioScoreSubmission(BASE));

    await act(async () => { result.current.submitLength(5, 3, true); });

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/game-scores");
    const body = JSON.parse(init.body as string);
    expect(body.game_id).toBe("leksiarxeio");
    expect(body.puzzle_date).toBe("2026-05-26");
    expect(body.word_length).toBe(5);
    expect(body.device_id).toBe("device-abc");
    expect(body.points).toBe(4); // 3 guesses → 4 pts
    expect(body.display_name).toBe("Γιώργος");
  });

  it("maps a failed game to 0 points (not the old 7-attempt penalty)", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useLeksiarxeioScoreSubmission(BASE));

    await act(async () => { result.current.submitLength(5, 6, false); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.points).toBe(0);
  });

  it("maps a first-try win to 6 points", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useLeksiarxeioScoreSubmission(BASE));

    await act(async () => { result.current.submitLength(4, 1, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.points).toBe(6);
  });

  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useLeksiarxeioScoreSubmission({ ...BASE, deviceId: "" }));

    await act(async () => { result.current.submitLength(5, 3, true); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("falls back to 'Ανώνυμος' when displayName is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useLeksiarxeioScoreSubmission({ ...BASE, displayName: "" }));

    await act(async () => { result.current.submitLength(5, 3, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Ανώνυμος");
  });

  it("uses the latest displayName via ref without re-creating submitLength", async () => {
    const spy = mockFetch();
    const { result, rerender } = renderHook(
      (props: { displayName: string }) => useLeksiarxeioScoreSubmission({ ...BASE, ...props }),
      { initialProps: { displayName: "Παλιό" } },
    );

    const submitLengthBefore = result.current.submitLength;
    rerender({ displayName: "Νέο" });

    await act(async () => { result.current.submitLength(5, 3, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Νέο");
    expect(result.current.submitLength).toBe(submitLengthBefore);
  });
});
