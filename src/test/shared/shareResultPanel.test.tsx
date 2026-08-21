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

  // ADR 0027 made `score` optional for the two Games that lost their scoring
  // outright. Both halves matter: the heading must vanish rather than render as
  // zero, and the six Games that still pass a score must look exactly as before.
  it("renders the score heading when a score is passed", () => {
    renderPanel();
    expect(screen.getByRole("heading")).toHaveTextContent("17 πόντοι");
  });

  it("renders no score element at all when score is undefined", () => {
    render(
      <ShareResultPanel testId="panel-under-test" shareText={SHARE_TEXT}>
        <p>reveal</p>
      </ShareResultPanel>,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByTestId("panel-under-test")).not.toHaveTextContent(/πόντοι/);
    // The rest of the panel is untouched: the reveal and the share button stay.
    expect(screen.getByText("reveal")).toBeInTheDocument();
    expect(screen.getByTestId("btn-share-result")).toBeInTheDocument();
  });
});
