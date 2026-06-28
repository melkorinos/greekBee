// useGameEndCallback.test.ts — fires onGameEnd exactly once on status transition.

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGameEndCallback } from "@/hooks/useGameEndCallback";

describe("useGameEndCallback", () => {
  it("fires when status transitions playing → won", () => {
    const onGameEnd = vi.fn();
    const { rerender } = renderHook(
      ({ status }: { status: string }) => useGameEndCallback(status, 3, onGameEnd),
      { initialProps: { status: "playing" } },
    );
    expect(onGameEnd).not.toHaveBeenCalled();
    act(() => rerender({ status: "won" }));
    expect(onGameEnd).toHaveBeenCalledOnce();
    expect(onGameEnd).toHaveBeenCalledWith(3, true);
  });

  it("fires when status transitions playing → lost, passing won=false", () => {
    const onGameEnd = vi.fn();
    const { rerender } = renderHook(
      ({ status }: { status: string }) => useGameEndCallback(status, 6, onGameEnd),
      { initialProps: { status: "playing" } },
    );
    act(() => rerender({ status: "lost" }));
    expect(onGameEnd).toHaveBeenCalledWith(6, false);
  });

  it("does NOT fire while status stays playing", () => {
    const onGameEnd = vi.fn();
    const { rerender } = renderHook(
      ({ status }: { status: string }) => useGameEndCallback(status, 2, onGameEnd),
      { initialProps: { status: "playing" } },
    );
    act(() => rerender({ status: "playing" }));
    act(() => rerender({ status: "playing" }));
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it("fires exactly once even on multiple re-renders after transition", () => {
    const onGameEnd = vi.fn();
    const { rerender } = renderHook(
      ({ status }: { status: string }) => useGameEndCallback(status, 4, onGameEnd),
      { initialProps: { status: "playing" } },
    );
    act(() => rerender({ status: "won" }));
    act(() => rerender({ status: "won" }));
    act(() => rerender({ status: "won" }));
    expect(onGameEnd).toHaveBeenCalledOnce();
  });

  it("does NOT fire when hook mounts already in a non-playing status", () => {
    const onGameEnd = vi.fn();
    const { rerender } = renderHook(
      ({ status }: { status: string }) => useGameEndCallback(status, 0, onGameEnd),
      { initialProps: { status: "won" } },
    );
    act(() => rerender({ status: "won" }));
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it("does not throw when onGameEnd is undefined", () => {
    expect(() => {
      const { rerender } = renderHook(
        ({ status }: { status: string }) => useGameEndCallback(status, 3, undefined),
        { initialProps: { status: "playing" } },
      );
      act(() => rerender({ status: "won" }));
    }).not.toThrow();
  });
});
