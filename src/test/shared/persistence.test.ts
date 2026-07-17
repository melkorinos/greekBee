// persistence.test.ts — integration tests for useRoundPersistence.
// Verifies that the unified persistence hook correctly reads, writes, and clears
// game round state in localStorage via the useGameStore envelope.

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { readSlice, writeSlice } from "@/hooks/useGameStore";

import { useRoundPersistence } from "@/hooks/useRoundPersistence";
import { useMemo } from "react";

// ── Fixture ───────────────────────────────────────────────────────────────────

interface TestSnapshot {
  score:      number;
  foundWords: string[];
}

const GAME_ID  = "leksokipos" as const;
const SESSION  = "test-puzzle-id";
const SNAPSHOT: TestSnapshot = { score: 10, foundWords: ["αλφα"] };

// Helper: render the hook with a fixed snapshot
function renderPersistence(
  snapshot: TestSnapshot,
  sessionKey = SESSION,
  onRestore = vi.fn(),
  shouldSave?: (s: TestSnapshot) => boolean,
) {
  return renderHook(
    ({ snap, key, restore, save }) =>
      useRoundPersistence(GAME_ID, key, snap, restore, save),
    {
      initialProps: {
        snap:    snapshot,
        key:     sessionKey,
        restore: onRestore,
        save:    shouldSave,
      },
    },
  );
}

// ── Hydration ─────────────────────────────────────────────────────────────────

describe("hydration", () => {
  it("calls onRestore with the saved snapshot when sessionKey matches", () => {
    writeSlice(GAME_ID, { [SESSION]: SNAPSHOT });
    const onRestore = vi.fn();
    renderPersistence(SNAPSHOT, SESSION, onRestore);
    expect(onRestore).toHaveBeenCalledWith(SNAPSHOT);
  });

  it("does not call onRestore when nothing is saved", () => {
    const onRestore = vi.fn();
    renderPersistence(SNAPSHOT, SESSION, onRestore);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("does not call onRestore when the stored session is under a different key", () => {
    writeSlice(GAME_ID, { "other-puzzle-id": SNAPSHOT });
    const onRestore = vi.fn();
    renderPersistence(SNAPSHOT, SESSION, onRestore);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("does not call onRestore when the slice exists but is corrupt", () => {
    // Force a non-SessionStore format by writing a string
    (localStorage as Storage).setItem("wordgames:state", "{{broken json");
    const onRestore = vi.fn();
    renderPersistence(SNAPSHOT, SESSION, onRestore);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("re-runs hydration when sessionKey changes", () => {
    const savedA: TestSnapshot = { score: 5, foundWords: ["αλφα"] };
    const savedB: TestSnapshot = { score: 9, foundWords: ["βητα"] };
    writeSlice(GAME_ID, { "session-a": savedA, "session-b": savedB });

    const onRestore = vi.fn();
    const { rerender } = renderPersistence(savedA, "session-a", onRestore);
    expect(onRestore).toHaveBeenLastCalledWith(savedA);

    onRestore.mockClear();
    rerender({ snap: savedB, key: "session-b", restore: onRestore, save: undefined });
    expect(onRestore).toHaveBeenLastCalledWith(savedB);
  });
});

// ── Saving ────────────────────────────────────────────────────────────────────

describe("saving", () => {
  it("writes the snapshot to localStorage under the session key", () => {
    renderPersistence(SNAPSHOT);
    const store = readSlice<Record<string, TestSnapshot>>(GAME_ID);
    expect(store?.[SESSION]).toEqual(SNAPSHOT);
  });

  it("merges with existing sessions instead of overwriting the slice", () => {
    const otherSession: TestSnapshot = { score: 3, foundWords: ["βηταα"] };
    writeSlice(GAME_ID, { "other-id": otherSession });

    renderPersistence(SNAPSHOT, SESSION);

    const store = readSlice<Record<string, TestSnapshot>>(GAME_ID);
    expect(store?.["other-id"]).toEqual(otherSession);
    expect(store?.[SESSION]).toEqual(SNAPSHOT);
  });

  it("skips the write when shouldSave returns false", () => {
    renderPersistence(SNAPSHOT, SESSION, vi.fn(), () => false);
    expect(readSlice(GAME_ID)).toBeNull();
  });

  it("writes when shouldSave returns true", () => {
    renderPersistence(SNAPSHOT, SESSION, vi.fn(), (s) => s.score > 0);
    const store = readSlice<Record<string, TestSnapshot>>(GAME_ID);
    expect(store?.[SESSION]).toEqual(SNAPSHOT);
  });

  it("re-saves when the snapshot changes", () => {
    const initial: TestSnapshot = { score: 1, foundWords: ["αλφα"] };
    const updated: TestSnapshot = { score: 2, foundWords: ["αλφα", "βητα"] };

    // Use a hook that re-memos the snapshot from props
    const { rerender } = renderHook(
      ({ score, words }: { score: number; words: string[] }) => {
        const snap = useMemo<TestSnapshot>(
          () => ({ score, foundWords: words }),
          [score, words],
        );
        return useRoundPersistence(GAME_ID, SESSION, snap, vi.fn());
      },
      { initialProps: { score: initial.score, words: initial.foundWords } },
    );

    expect(readSlice<Record<string, TestSnapshot>>(GAME_ID)?.[SESSION]).toEqual(initial);

    rerender({ score: updated.score, words: updated.foundWords });
    expect(readSlice<Record<string, TestSnapshot>>(GAME_ID)?.[SESSION]).toEqual(updated);
  });
});

// ── clear() ───────────────────────────────────────────────────────────────────

describe("clear()", () => {
  it("removes only the current session from the slice", () => {
    const other: TestSnapshot = { score: 3, foundWords: ["βηταα"] };
    writeSlice(GAME_ID, { [SESSION]: SNAPSHOT, "other-id": other });

    const { result } = renderPersistence(SNAPSHOT);
    act(() => result.current());

    const store = readSlice<Record<string, TestSnapshot>>(GAME_ID);
    expect(store?.[SESSION]).toBeUndefined();
    expect(store?.["other-id"]).toEqual(other);
  });

  it("removes the entire slice when it held only this session", () => {
    writeSlice(GAME_ID, { [SESSION]: SNAPSHOT });

    const { result } = renderPersistence(SNAPSHOT);
    act(() => result.current());

    expect(readSlice(GAME_ID)).toBeNull();
  });

  it("does not disturb other game slices when clearing", () => {
    writeSlice(GAME_ID, { [SESSION]: SNAPSHOT });
    writeSlice("leksiarxeio", { "2026-05-22-leksiarxeio-5": { guesses: [], status: "playing" } });

    const { result } = renderPersistence(SNAPSHOT);
    act(() => result.current());

    expect(readSlice("leksiarxeio")).not.toBeNull();
  });
});
