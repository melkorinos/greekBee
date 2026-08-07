// gamePageChrome.test.tsx — the chrome every game page wraps its board in.
//
// These contracts used to be re-asserted (or, more often, not asserted at all)
// once per page client. They live here now: the two header triggers, the state
// they drive, the `paused`-style rules flag, and — the load-bearing one — that a
// change of Session key remounts the board subtree while leaving the chrome's
// own state alone.

import type { ReactNode } from "react";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import {
  GamePageChrome,
  type GameChromeRenderProps,
} from "@/components/shared/GamePageChrome";

// ── Probes ────────────────────────────────────────────────────────────────────

/** A stand-in board that reports the chrome props it was handed. */
function ProbeBoard({ leaderboard, isHowToPlayOpen }: GameChromeRenderProps) {
  return (
    <div>
      <span data-testid="lb-open">{String(leaderboard.isLeaderboardOpen)}</span>
      <span data-testid="htp-flag">{String(isHowToPlayOpen)}</span>
      <button onClick={leaderboard.onOpenLeaderboard}>open from board</button>
      <button onClick={leaderboard.onCloseLeaderboard}>close from board</button>
    </div>
  );
}

/** Counts mounts, so the session-key remount can be observed directly. */
function MountReporter({ onMount, children }: { onMount?: () => void; children: ReactNode }) {
  // Mount effect, not a render-time ref (react-hooks/refs rejects that). The
  // callers pass one stable vi.fn(), so this fires once per mount and no more.
  useEffect(() => { onMount?.(); }, [onMount]);
  return <>{children}</>;
}

function Rules({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div role="dialog">
      <p>κανόνες παιχνιδιού</p>
      <button onClick={onClose}>κλείσιμο</button>
    </div>
  );
}

function chrome(sessionKey: string, onMount?: () => void) {
  return (
    <GamePageChrome
      title="🧪 Δοκιμή"
      sessionKey={sessionKey}
      howToPlay={(props) => <Rules {...props} />}
    >
      {(props) => (
        <MountReporter onMount={onMount}>
          <ProbeBoard {...props} />
        </MountReporter>
      )}
    </GamePageChrome>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

describe("GamePageChrome — header", () => {
  it("renders the title and both triggers", () => {
    render(chrome("2026-08-07"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Δοκιμή");
    expect(screen.getByRole("button", { name: /πίνακας σκορ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /πώς να παίξεις/i })).toBeDefined();
  });

  it("the 🏆 trigger opens the leaderboard through the board's props", async () => {
    const user = userEvent.setup();
    render(chrome("2026-08-07"));
    expect(screen.getByTestId("lb-open").textContent).toBe("false");

    await user.click(screen.getByRole("button", { name: /πίνακας σκορ/i }));
    expect(screen.getByTestId("lb-open").textContent).toBe("true");
  });

  it("the board can open and close the leaderboard itself", async () => {
    const user = userEvent.setup();
    render(chrome("2026-08-07"));

    await user.click(screen.getByRole("button", { name: "open from board" }));
    expect(screen.getByTestId("lb-open").textContent).toBe("true");

    await user.click(screen.getByRole("button", { name: "close from board" }));
    expect(screen.getByTestId("lb-open").textContent).toBe("false");
  });
});

// ── Rules modal ───────────────────────────────────────────────────────────────

describe("GamePageChrome — rules modal", () => {
  it("the ? trigger opens the modal and the modal can close itself", async () => {
    const user = userEvent.setup();
    render(chrome("2026-08-07"));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /πώς να παίξεις/i }));
    expect(screen.getByRole("dialog")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "κλείσιμο" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Λεξοδρομία pauses its decay clock on this flag, and nothing else reads it —
  // which is exactly why it needs a test that is not Λεξοδρομία's.
  it("exposes the rules-open flag to the board", async () => {
    const user = userEvent.setup();
    render(chrome("2026-08-07"));
    expect(screen.getByTestId("htp-flag").textContent).toBe("false");

    await user.click(screen.getByRole("button", { name: /πώς να παίξεις/i }));
    expect(screen.getByTestId("htp-flag").textContent).toBe("true");
  });
});

// ── The Session key ───────────────────────────────────────────────────────────

describe("GamePageChrome — the Session key", () => {
  it("remounts the board subtree only when the Session key changes", () => {
    const onMount = vi.fn();
    const { rerender } = render(chrome("2026-08-07", onMount));
    expect(onMount).toHaveBeenCalledTimes(1);

    // Same key, re-rendered — the board stays mounted.
    rerender(chrome("2026-08-07", onMount));
    expect(onMount).toHaveBeenCalledTimes(1);

    // New key — a Session belongs to one Puzzle, so the board starts over.
    rerender(chrome("2026-08-01", onMount));
    expect(onMount).toHaveBeenCalledTimes(2);
  });

  it("keeps the chrome's own state across a Session change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(chrome("2026-08-07"));

    await user.click(screen.getByRole("button", { name: /πίνακας σκορ/i }));
    expect(screen.getByTestId("lb-open").textContent).toBe("true");

    // The leaderboard modal lives above the board, and its day-strip is what
    // switches dates — remounting the board must not slam the modal shut.
    rerender(chrome("2026-08-01"));
    expect(screen.getByTestId("lb-open").textContent).toBe("true");
  });
});
