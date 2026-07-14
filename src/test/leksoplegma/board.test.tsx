// board.test.tsx — LeksoplegmaBoard + LeksoplegmaPageClient behavior.
// Tap-to-build tracing through the reducer seam (pointer-drag physics are not
// unit-tested — both control schemes submit the same TRACE_WORD action).
// A completed word auto-submits (no submit button); covers collapse rendering,
// bonus counter, recap, and the single score post.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LeksoplegmaBoard } from "@/components/leksoplegma/LeksoplegmaBoard";
import { LeksoplegmaPageClient } from "@/components/leksoplegma/LeksoplegmaPageClient";
import { postScore } from "@/lib/postScore";

// ── Stubs — network/profile stack is out of scope here ────────────────────────

vi.mock("@/lib/postScore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/postScore")>()),
  postScore: vi.fn(),
}));
vi.mock("@/components/leksoplegma/LeksoplegmaLeaderboardModal", () => ({
  LeksoplegmaLeaderboardModal: () => null,
}));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profileLinked: false,
    createProfile: vi.fn(),
    generateTransferCode: vi.fn(),
    claimTransferCode: vi.fn(),
    disconnect: vi.fn(),
  }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authLinked: false,
    authUserName: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// ── Fixture ───────────────────────────────────────────────────────────────────
// 16 distinct letters so every tile is uniquely addressable by name.
// Required: αβγ (0-1-2), γδε (2-3-4), εζ (4-5). Bonus βγ rides edge 1-2.
// (Runtime never re-checks grid geometry — edges come from the authored paths.)

const PUZZLE = {
  id:         "fixture-1",
  letters:    "αβγδεζηθικλμνξοπ",
  paths:      { αβγ: [0, 1, 2], γδε: [2, 3, 4], εζ: [4, 5] },
  bonusWords: ["βγ"],
};
const TODAY = "2026-07-14";

function renderBoard() {
  return render(
    <LeksoplegmaBoard
      puzzle={PUZZLE}
      today={TODAY}
      isLeaderboardOpen={false}
      onOpenLeaderboard={() => {}}
      onCloseLeaderboard={() => {}}
    />,
  );
}

function tile(letter: string) {
  return screen.getByRole("button", { name: `Γράμμα ${letter}` });
}

/** Tap the tiles spelling `word`. A fresh valid word auto-submits on the last tap. */
async function tapWord(user: ReturnType<typeof userEvent.setup>, word: string) {
  for (const letter of word) await user.click(tile(letter));
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(postScore).mockClear();
});

// ── Board ─────────────────────────────────────────────────────────────────────

describe("LeksoplegmaBoard", () => {
  it("renders the live tiles and the required-word progress", () => {
    renderBoard();
    for (const letter of "αβγδεζ") {
      expect(tile(letter)).toBeDefined(); // covered by a required path
    }
    // On real boards every tile is path-covered (generator constraint);
    // this fixture leaves π uncovered, so it must not be on the board.
    expect(screen.queryByRole("button", { name: "Γράμμα π" })).toBeNull();
    expect(screen.getByText(/λέξεις 0\/3/i)).toBeDefined();
  });

  it("tap-builds a required word and auto-submits it with its points", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ"); // the γ tap completes αβγ → auto-submit
    expect(screen.getByText(/λέξεις 1\/3/i)).toBeDefined();
    expect(screen.getByTestId("found-words").textContent).toContain("αβγ");
    expect(screen.getByTestId("found-words").textContent).toContain("30");
  });

  it("collapses tiles no remaining required word needs", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ");
    // β (tile 1) served only αβγ — it must leave the board
    expect(screen.queryByRole("button", { name: "Γράμμα β" })).toBeNull();
    // γ still anchors γδε
    expect(tile("γ")).toBeDefined();
  });

  it("ignores a tap on a tile with no drawn edge from the trace end", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(tile("α"));
    await user.click(tile("δ")); // δ is live, but no α-δ edge was ever drawn
    expect(screen.getByTestId("building-word").textContent).toBe("α");
  });

  it("does not auto-submit or advance a tap trace that spells no word", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "δε"); // live edge 3-4, but not a puzzle word — never completes
    expect(screen.getByTestId("building-word").textContent).toBe("δε");
    expect(screen.getByText(/λέξεις 0\/3/i)).toBeDefined();
    expect(screen.queryByText(/δεν υπάρχει/i)).toBeNull();
  });

  it("auto-submits a bonus word once, then a re-tap of it does nothing", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "βγ"); // fresh bonus → auto-submits
    expect(screen.getByTestId("bonus-counter").textContent).toContain("1");
    expect(screen.getByTestId("bonus-counter").textContent).toContain("+25");
    await tapWord(user, "βγ"); // already found — no auto-submit, count unchanged
    expect(screen.getByTestId("bonus-counter").textContent).toContain("1");
  });

  it("finishing shows the recap with every required word and posts the score once", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ");
    await tapWord(user, "γδε");
    await tapWord(user, "εζ");

    const recap = screen.getByTestId("round-recap");
    for (const word of Object.keys(PUZZLE.paths)) {
      expect(recap.textContent).toContain(word);
    }
    expect(postScore).toHaveBeenCalledTimes(1);
    const [, body] = vi.mocked(postScore).mock.calls[0];
    expect(body).toMatchObject({
      game_id:     "leksoplegma",
      puzzle_date: TODAY,
      score:       80, // 30 + 30 + 20, no hints, no bonus
      is_perfect:  true,
    });
  });

  it("does not re-post when a finished round is restored from persistence", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      leksoplegma: {
        [TODAY]: {
          puzzleId:      TODAY,
          foundRequired: Object.keys(PUZZLE.paths),
          foundBonus:    [],
          hintsUsed:     [],
          status:        "finished",
        },
      },
    }));
    renderBoard();
    expect(screen.getByTestId("round-recap")).toBeDefined();
    expect(postScore).not.toHaveBeenCalled();
  });
});

// ── PageClient ────────────────────────────────────────────────────────────────

describe("LeksoplegmaPageClient", () => {
  it("renders the title, leaderboard trigger, and rules trigger", () => {
    render(<LeksoplegmaPageClient puzzle={PUZZLE} today={TODAY} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Λεξόπλεγμα");
    expect(screen.getByRole("button", { name: /πίνακας σκορ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /πώς να παίξεις/i })).toBeDefined();
  });

  it("the rules modal explains tracing and scoring, with no timer anywhere", async () => {
    const user = userEvent.setup();
    render(<LeksoplegmaPageClient puzzle={PUZZLE} today={TODAY} />);
    await user.click(screen.getByRole("button", { name: /πώς να παίξεις/i }));
    expect(screen.getAllByText(/πόντο/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/μονοπάτ|γραμμ/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/χρονόμετρο|δευτερόλεπτ/i)).toBeNull();
  });
});
