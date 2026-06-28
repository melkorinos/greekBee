// useGameStateSync.test.ts — tests for the cross-device push of found words.
//
// The push is the *only* writer to /api/game-state. The key behaviour under test
// is the backfill: words found *before* a profile is linked must be uploaded the
// moment the profile becomes linked — otherwise a transfer to a second device
// restores nothing (the reported "found words don't transfer" bug).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useGameStateSync } from "@/hooks/useGameStateSync";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/hooks/useGameStore", () => ({
  getOrCreateDeviceId: vi.fn(() => "device-abc"),
  // isProfileLinked is no longer consulted by the hook (the reactive prop is),
  // but keep it mocked so the import resolves.
  isProfileLinked:     vi.fn(() => false),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   true,
    json: async () => ({ ok: true }),
  } as Response);
}

function lastPostBody(spy: ReturnType<typeof mockFetch>) {
  const call = spy.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(call[1].body as string) as {
    device_uuid: string;
    game_id:     string;
    puzzle_date: string;
    state:       { foundWords: string[] };
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => vi.restoreAllMocks());

describe("useGameStateSync — backfill on link", () => {
  it("does not push while the profile is unlinked, even as words are found", async () => {
    const spy = mockFetch();

    const { rerender } = renderHook(
      ({ foundWords }) =>
        useGameStateSync({ puzzleDate: "2026-01-01", isDaily: true, profileLinked: false, foundWords }),
      { initialProps: { foundWords: [] as string[] } },
    );

    await act(async () => { rerender({ foundWords: ["αντι"] }); });
    await act(async () => { rerender({ foundWords: ["αντι", "παιδι"] }); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("backfills all words already found when the profile becomes linked", async () => {
    const spy = mockFetch();

    // Real flow: mount empty + unlinked, accumulate 5 words while unlinked
    // (nothing pushed), then link to generate a transfer code.
    const found = ["αντι", "παιδι", "παιδια", "ταινια", "πεδια"];
    const { rerender } = renderHook(
      ({ foundWords, profileLinked }) =>
        useGameStateSync({ puzzleDate: "2026-01-01", isDaily: true, profileLinked, foundWords }),
      { initialProps: { foundWords: [] as string[], profileLinked: false } },
    );

    for (let i = 1; i <= found.length; i++) {
      await act(async () => { rerender({ foundWords: found.slice(0, i), profileLinked: false }); });
    }
    expect(spy).not.toHaveBeenCalled();

    // Link the profile (create nickname / claim code) — words must now backfill.
    await act(async () => { rerender({ foundWords: found, profileLinked: true }); });

    expect(spy).toHaveBeenCalledOnce();
    const body = lastPostBody(spy);
    expect(body.device_uuid).toBe("device-abc");
    expect(body.game_id).toBe("leksokipos");
    expect(body.puzzle_date).toBe("2026-01-01");
    expect(body.state.foundWords).toEqual(found);
  });
});

describe("useGameStateSync — incremental push when already linked", () => {
  beforeEach(() => { /* nothing — fetch mocked per-test */ });

  it("pushes the full set on each new word", async () => {
    const spy = mockFetch();

    const { rerender } = renderHook(
      ({ foundWords }) =>
        useGameStateSync({ puzzleDate: "2026-01-01", isDaily: true, profileLinked: true, foundWords }),
      { initialProps: { foundWords: [] as string[] } },
    );

    await act(async () => { rerender({ foundWords: ["αντι"] }); });
    await act(async () => { rerender({ foundWords: ["αντι", "παιδι"] }); });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(lastPostBody(spy).state.foundWords).toEqual(["αντι", "παιδι"]);
  });

  it("does not push for non-daily puzzles", async () => {
    const spy = mockFetch();

    const { rerender } = renderHook(
      ({ foundWords }) =>
        useGameStateSync({ puzzleDate: "custom", isDaily: false, profileLinked: true, foundWords }),
      { initialProps: { foundWords: [] as string[] } },
    );

    await act(async () => { rerender({ foundWords: ["αντι"] }); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not push when the profile links before any word is found (empty backfill)", async () => {
    const spy = mockFetch();

    const { rerender } = renderHook(
      ({ profileLinked }) =>
        useGameStateSync({ puzzleDate: "2026-01-01", isDaily: true, profileLinked, foundWords: [] }),
      { initialProps: { profileLinked: false } },
    );

    // Link with nothing found yet — there is nothing to back-fill.
    await act(async () => { rerender({ profileLinked: true }); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not re-push on a re-render that adds no new word (per-word dedup)", async () => {
    const spy = mockFetch();

    const { rerender } = renderHook(
      ({ foundWords }) =>
        useGameStateSync({ puzzleDate: "2026-01-01", isDaily: true, profileLinked: true, foundWords }),
      { initialProps: { foundWords: [] as string[] } },
    );

    await act(async () => { rerender({ foundWords: ["αντι"] }); });      // grows → push
    await act(async () => { rerender({ foundWords: ["αντι"] }); });      // same length → no push

    expect(spy).toHaveBeenCalledOnce();
  });
});
