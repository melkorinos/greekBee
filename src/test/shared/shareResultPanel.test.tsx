// shareResultPanel.test.tsx — the Platform's one Result Panel (ADR 0025).
//
// What a unit test CAN hold is the fallback and the cancel path. It CANNOT hold
// the native share itself: `navigator.share` is browser behaviour, and a mock of
// it is a claim about someone else's contract (the `router.prefetch`-returns-void
// and jsdom's `play()`-returns-undefined bugs both shipped that way). The real
// sheet needs one operator check on a phone.
//
// The cancel path is the one that matters here: a player who opens the native
// sheet and backs out REJECTS the promise, and that must read as "nothing
// happened", never as an error and never as a silent clipboard copy they did not
// ask for.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";

const SHARE_TEXT = "Leksiarxeio 17/08\n🟩🟩⬛🟩🟩\nΣκορ: 17\nhttps://example.test/leksiarxeio";

function renderPanel(onOpenLeaderboard?: () => void) {
  return render(
    <ShareResultPanel
      testId="panel-under-test"
      score={17}
      shareText={SHARE_TEXT}
      onOpenLeaderboard={onOpenLeaderboard}
    >
      <p>reveal</p>
    </ShareResultPanel>,
  );
}

const clickShare = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("btn-share-result"));
  });
};

describe("ShareResultPanel", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } });
    // The stub is a plain vi.fn() shared by every test, so its call history
    // survives restoreAllMocks — reset it, or "did not copy" passes on a stale count.
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    // jsdom has no navigator.share — the fallback path is the default here, and
    // each native-path test opts in by assigning one.
    delete (navigator as { share?: unknown }).share;
  });

  afterEach(() => {
    delete (navigator as { share?: unknown }).share;
    vi.restoreAllMocks();
  });

  it("copies to the clipboard when the browser cannot share natively", async () => {
    renderPanel();
    await clickShare();

    expect(writeText).toHaveBeenCalledWith(SHARE_TEXT);
    await waitFor(() => {
      expect(screen.getByTestId("btn-share-result")).toHaveTextContent("Αντιγράφηκε");
    });
  });

  // ── The two paths must not wear the same label (2026-08-25) ────────────────
  //
  // A desktop player pressed «Κοινοποίηση», got a working-but-invisible clipboard
  // write, and read the button as broken. The label is the whole fix, so it is the
  // thing asserted: what the button PROMISES has to match the path it will take.

  it("labels the button Αντιγραφή where there is no native sheet", async () => {
    renderPanel();

    // Resolved in an effect, so the assertion waits for the post-mount paint
    // rather than the server-shaped first one.
    await waitFor(() => {
      expect(screen.getByTestId("btn-share-result")).toHaveTextContent("Αντιγραφή");
    });
  });

  it("labels the button Κοινοποίηση where a native sheet exists", async () => {
    Object.assign(navigator, { share: vi.fn().mockResolvedValue(undefined) });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("btn-share-result")).toHaveTextContent("Κοινοποίηση");
    });
  });

  it("reveals the summary for manual copying when the clipboard refuses", async () => {
    // Insecure origin or a permissions policy. This used to be swallowed whole:
    // the button did nothing at all and the player lost the round's summary.
    writeText.mockRejectedValue(new Error("NotAllowedError"));

    renderPanel();
    await clickShare();

    const fallback = await screen.findByTestId("share-manual-fallback");
    expect(fallback).toHaveTextContent("Η αντιγραφή δεν έγινε");
    // The summary itself has to be present and selectable, not merely mentioned.
    expect(screen.getByRole("textbox")).toHaveValue(SHARE_TEXT);
    // And the button must not claim a copy that did not happen.
    expect(screen.getByTestId("btn-share-result")).not.toHaveTextContent("Αντιγράφηκε");
  });

  it("shows no manual fallback while the clipboard is working", async () => {
    renderPanel();
    await clickShare();

    expect(screen.queryByTestId("share-manual-fallback")).not.toBeInTheDocument();
  });

  it("hands the summary to the native sheet when one exists, without copying", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });

    renderPanel();
    await clickShare();

    expect(share).toHaveBeenCalledWith({ text: SHARE_TEXT });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("treats a cancelled native sheet as nothing happening", async () => {
    const abort = Object.assign(new Error("Share canceled"), { name: "AbortError" });
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(abort) });

    renderPanel();
    await clickShare();

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByTestId("btn-share-result")).toHaveTextContent("Κοινοποίηση");
  });

  it("falls back to the clipboard when the native sheet fails for a real reason", async () => {
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });

    renderPanel();
    await clickShare();

    expect(writeText).toHaveBeenCalledWith(SHARE_TEXT);
  });

  it("renders the leaderboard link only when the Game has a board", () => {
    const { unmount } = renderPanel(vi.fn());
    expect(screen.getByText("Δες τον πίνακα σκορ")).toBeInTheDocument();
    unmount();

    renderPanel();
    expect(screen.queryByText("Δες τον πίνακα σκορ")).not.toBeInTheDocument();
  });
});
