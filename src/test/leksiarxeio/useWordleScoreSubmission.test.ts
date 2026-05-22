// useWordleScoreSubmission.test.ts — unit tests for the Wordle score-posting hook.
//
// fetch is mocked per-test via vi.spyOn.

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWordleScoreSubmission } from "@/hooks/useWordleScoreSubmission";

afterEach(() => vi.restoreAllMocks());

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  } as Response);
}

const BASE = {
  today:       "2026-05-22",
  deviceId:    "device-abc",
  displayName: "Νίκος",
};

describe("useWordleScoreSubmission — submit()", () => {
  it("POSTs to /api/wordle-scores with correct fields", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useWordleScoreSubmission(BASE));

    await act(async () => { result.current.submit(5, 3, true); });

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/wordle-scores");
    const body = JSON.parse(init.body as string);
    expect(body.puzzle_date).toBe("2026-05-22");
    expect(body.word_length).toBe(5);
    expect(body.device_id).toBe("device-abc");
    expect(body.display_name).toBe("Νίκος");
    expect(body.attempts).toBe(3);
  });

  it("does not POST when deviceId is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useWordleScoreSubmission({ ...BASE, deviceId: "" }));

    await act(async () => { result.current.submit(5, 3, true); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("passes attempts as-is when the player won", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useWordleScoreSubmission(BASE));

    await act(async () => { result.current.submit(5, 4, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.attempts).toBe(4);
  });

  it("maps attempts to 7 (penalty) when the player lost", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useWordleScoreSubmission(BASE));

    await act(async () => { result.current.submit(5, 6, false); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.attempts).toBe(7);
  });

  it("falls back to 'Ανώνυμος' when displayName is empty", async () => {
    const spy = mockFetch();
    const { result } = renderHook(() => useWordleScoreSubmission({ ...BASE, displayName: "" }));

    await act(async () => { result.current.submit(5, 2, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Ανώνυμος");
  });

  it("uses the latest displayName via ref without re-creating submit", async () => {
    const spy = mockFetch();
    const { result, rerender } = renderHook(
      (props: { displayName: string }) => useWordleScoreSubmission({ ...BASE, ...props }),
      { initialProps: { displayName: "Παλιό" } },
    );

    // Capture submit reference before re-render
    const submitBefore = result.current.submit;

    // Update displayName — submit should be the same function (stable ref)
    rerender({ displayName: "Νέο" });

    await act(async () => { result.current.submit(5, 1, true); });

    const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.display_name).toBe("Νέο");
    // submit is stable across displayName changes (no unnecessary re-renders downstream)
    expect(result.current.submit).toBe(submitBefore);
  });
});
