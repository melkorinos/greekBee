"use client";

// usePhysicalKeyboard — routes window keydown events to a game board's key handler.
//
// Rules:
//   - The listener is registered exactly once, on mount. Re-registering it when the
//     handler identity changes would tear down and re-add the listener mid-keystroke,
//     so the handler is reached through a ref instead.
//   - The ref is refreshed in a layout effect with no dep array, i.e. after every
//     render and before the browser can paint (and so before any keydown can be
//     dispatched). This is what lets callers pass a fresh inline closure over their
//     current state without going stale — the usual reason a "register once" listener
//     reads yesterday's props.
//   - Modifier combos (⌘/Ctrl/Alt) never reach the handler: those are browser
//     shortcuts, not game input. Without this, Ctrl+A / ⌘+R deliver e.key === "a"/"r"
//     and get typed into the board.

import { useEffect, useLayoutEffect, useRef } from "react";

export function usePhysicalKeyboard(onKey: (e: KeyboardEvent) => void): void {
  const handlerRef = useRef(onKey);

  useLayoutEffect(() => {
    handlerRef.current = onKey;
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handlerRef.current(e);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
