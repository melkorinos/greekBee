// board.test.tsx — LeksoplegmaBoard + LeksoplegmaPageClient behavior.
// Tap-to-build tracing through the reducer seam (pointer-drag physics are not
// unit-tested — both control schemes submit the same TRACE_WORD action).
// Required words auto-submit; extra words submit via the ✓ button (never
// auto-submit — many are prefixes of required words). Covers soft-collapse
// rendering (dim, still tappable), extra-word chips, recap, and the single
// score post.

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
vi.mock("@/components/shared/GameLeaderboardModal", () => ({
  GameLeaderboardModal: () => null,
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
// Required: αβγ (0-1-2), γδε (2-3-4), εζ (4-5). Extra word βγδ rides on edges
// 1-2 and 2-3 — dimmed once αβγ/γδε are found, but still winnable (soft
// collapse). (Runtime never re-checks grid geometry — edges come from the
// authored paths.)

const PUZZLE = {
  id:         "fixture-1",
  letters:    "αβγδεζηθικλμνξοπ",
  paths:      { αβγ: [0, 1, 2], γδε: [2, 3, 4], εζ: [4, 5] },
  bonusWords: ["βγδ"],
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

  it("accepts a word tap-built in reverse and increments the counter", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "γβα"); // αβγ traced backwards — same undirected path
    expect(screen.getByText(/λέξεις 1\/3/i)).toBeDefined();
    expect(screen.getByTestId("found-words").textContent).toContain("αβγ");
  });

  it("soft collapse: cleared tiles dim but stay on the board and tappable", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ");
    // β (tile 1) served only αβγ — it dims but must NOT leave the board
    const beta = tile("β");
    expect(beta.className).toContain("opacity-40");
    // γ still anchors γδε — bright
    expect(tile("γ").className).not.toContain("opacity-40");
    // and the dimmed tile still participates in a trace
    await user.click(beta);
    expect(screen.getByTestId("building-word").textContent).toBe("β");
  });

  it("accepts a tap-built extra word via the ✓ button for flat points", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "βγδ"); // extra — never auto-submits
    expect(screen.getByTestId("building-word").textContent).toBe("βγδ");
    await user.click(screen.getByRole("button", { name: "Καταχώρηση" }));
    expect(screen.getByTestId("bonus-count").textContent).toContain("1");
    expect(screen.getByTestId("bonus-words").textContent).toContain("βγδ");
    expect(screen.getByTestId("bonus-words").textContent).toContain("25");
    expect(screen.getByText(/λέξεις 0\/3/i)).toBeDefined(); // required count untouched
  });

  it("soft collapse: an extra word is still accepted after its edges dimmed", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ"); // dims edge 1-2
    await tapWord(user, "γδε"); // dims edge 2-3
    await tapWord(user, "βγδ");
    await user.click(screen.getByRole("button", { name: "Καταχώρηση" }));
    expect(screen.getByTestId("bonus-count").textContent).toContain("1");
    expect(screen.getByTestId("bonus-words").textContent).toContain("βγδ");
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

  it("posts a partial score as soon as a word is found — no finish required", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ");
    expect(postScore).toHaveBeenCalledTimes(1);
    const [, body] = vi.mocked(postScore).mock.calls[0];
    expect(body).toMatchObject({ game_id: "leksoplegma", puzzle_date: TODAY, score: 30 });
  });

  it("finishing shows the recap and posts continuously, ending on the final score", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "αβγ");
    await tapWord(user, "γδε");
    await tapWord(user, "εζ");

    const recap = screen.getByTestId("round-recap");
    for (const word of Object.keys(PUZZLE.paths)) {
      expect(recap.textContent).toContain(word);
    }
    expect(postScore).toHaveBeenCalledTimes(3); // one per found word, strictly increasing
    const [, body] = vi.mocked(postScore).mock.calls.at(-1)!;
    expect(body).toMatchObject({
      game_id:     "leksoplegma",
      puzzle_date: TODAY,
      score:       80, // 30 + 30 + 20, no hints, no extras
    });
  });

  it("extra words found along the way count in the posted score and the recap", async () => {
    const user = userEvent.setup();
    renderBoard();
    await tapWord(user, "βγδ");
    await user.click(screen.getByRole("button", { name: "Καταχώρηση" }));
    await tapWord(user, "αβγ");
    await tapWord(user, "γδε");
    await tapWord(user, "εζ");

    expect(screen.getByTestId("recap-bonus").textContent).toContain("βγδ");
    const [, body] = vi.mocked(postScore).mock.calls.at(-1)!;
    expect(body).toMatchObject({ score: 105 }); // 80 required + 25 extra
  });

  it("restores found extra words from persistence", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      leksoplegma: {
        [TODAY]: {
          puzzleId:      TODAY,
          foundRequired: [],
          foundBonus:    ["βγδ"],
          hintsUsed:     [],
          status:        "playing",
        },
      },
    }));
    renderBoard();
    expect(screen.getByTestId("bonus-count").textContent).toContain("1");
    expect(screen.getByTestId("bonus-words").textContent).toContain("βγδ");
    expect(postScore).not.toHaveBeenCalled();
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
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Leksoplegma");
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

// ── Round End / Result Panel (ADR 0025) ───────────────────────────────────────
// Round End is every Required Word found. The recap becomes the shared Result
// Panel's children and gives up its own score heading, so the score is printed
// once per screen.

describe("LeksoplegmaBoard — Round End", () => {
  function restoreFinishedRound() {
    localStorage.setItem("wordgames:state", JSON.stringify({
      leksoplegma: {
        [TODAY]: {
          puzzleId:      TODAY,
          foundRequired: Object.keys(PUZZLE.paths),
          foundBonus:    ["βγδ"],
          hintsUsed:     [],
          status:        "finished",
        },
      },
    }));
  }

  it("wraps the recap in the shared Result Panel", () => {
    restoreFinishedRound();
    renderBoard();

    const panel = screen.getByTestId("leksoplegma-result");
    expect(panel).toContainElement(screen.getByTestId("round-recap"));
    expect(screen.getByTestId("btn-share-result")).toBeDefined();
  });

  it("prints the score once — the recap dropped its own heading", () => {
    restoreFinishedRound();
    renderBoard();

    const panel = screen.getByTestId("leksoplegma-result");
    expect(panel.textContent?.match(/πόντοι/g) ?? []).toHaveLength(1);
  });

  it("shows no Result Panel mid-round", () => {
    renderBoard();
    expect(screen.queryByTestId("leksoplegma-result")).toBeNull();
  });
});
