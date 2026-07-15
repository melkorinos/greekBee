// board.test.tsx — LeksodromiaBoard + LeksodromiaPageClient behavior.
// Tile rack → answer row interaction, wrong-submit feedback, hint reveal,
// two-phase skip with second chances (first skip requeues, second is final),
// end-of-round recap, and continuous score posting (per live increase).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LeksodromiaBoard } from "@/components/leksodromia/LeksodromiaBoard";
import { LeksodromiaPageClient } from "@/components/leksodromia/LeksodromiaPageClient";
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

const WORDS = [
  "αυγο", "βημα",
  "αγορα", "βαρκα",
  "γραμμα", "δασκοσ",
  "αγγελοσ", "βαθμιδα",
  "αγκαλιεσ", "βαρκαρησ",
];
const SCRAMBLES = [
  "γοαυ", "μαβη",
  "ρααγο", "καβαρ",
  "αμγμρα", "σοκαδσ",
  "γλοσαγε", "μιδαβαθ",
  "λακιεσγα", "ρσηκβααρ",
];
const PUZZLE = { date: "2026-07-13", words: WORDS, scrambles: SCRAMBLES };

function renderBoard() {
  return render(
    <LeksodromiaBoard
      puzzle={PUZZLE}
      today={PUZZLE.date}
      paused={false}
      isLeaderboardOpen={false}
      onOpenLeaderboard={() => {}}
      onCloseLeaderboard={() => {}}
    />,
  );
}

/** Click the rack tiles spelling `word`, using each physical tile once. */
async function pickWord(user: ReturnType<typeof userEvent.setup>, word: string) {
  const clicked = new Set<HTMLElement>();
  for (const letter of word) {
    const tile = screen
      .getAllByRole("button", { name: `Γράμμα ${letter}` })
      .find((el) => !clicked.has(el) && !(el as HTMLButtonElement).disabled);
    expect(tile).toBeDefined();
    clicked.add(tile!);
    await user.click(tile!);
  }
}

async function skipCurrentWord(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /επόμεν/i }));
  await user.click(screen.getByRole("button", { name: /σίγουρα/i }));
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(postScore).mockClear();
});

// ── Board ─────────────────────────────────────────────────────────────────────

describe("LeksodromiaBoard", () => {
  it("renders the progress counter and the scrambled rack of the first word", () => {
    renderBoard();
    expect(screen.getByText(/λέξη 1\/10/i)).toBeDefined();
    for (const letter of new Set(SCRAMBLES[0])) {
      expect(screen.getAllByRole("button", { name: `Γράμμα ${letter}` }).length)
        .toBeGreaterThan(0);
    }
  });

  it("filling the last slot auto-submits a correct word and advances", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, WORDS[0]); // "αυγο" — auto-submits on the 4th tile
    expect(screen.getByText(/λέξη 2\/10/i)).toBeDefined();
  });

  it("a wrong word auto-submits, shows an error, clears the input, and stays put", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, "γοαυ"); // valid tiles, wrong order — auto-submits
    expect(screen.getByText(/λέξη 1\/10/i)).toBeDefined();
    expect(screen.getByText(/λάθος/i)).toBeDefined();
    expect(screen.getByTestId("answer-row").textContent).toBe(""); // cleared
  });

  it("the clear button empties the answer row without submitting", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, "γοα"); // 3 of 4 tiles — no auto-submit yet
    expect(screen.getByTestId("answer-row").textContent).not.toBe("");
    await user.click(screen.getByRole("button", { name: /καθαρισμός/i }));
    expect(screen.getByTestId("answer-row").textContent).toBe("");
    expect(screen.getByText(/λέξη 1\/10/i)).toBeDefined();
  });

  it("tapping the answer row removes only the most recent letter", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, "γοα"); // 3 of 4 tiles — no auto-submit yet
    expect(screen.getByTestId("answer-row").textContent).toBe("γοα");
    await user.click(screen.getByTestId("answer-row")); // removes the last letter
    expect(screen.getByTestId("answer-row").textContent).toBe("γο");
    expect(screen.getByText(/λέξη 1\/10/i)).toBeDefined();
  });

  it("skip is two-phase and requeues: the word returns at the end of the run", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(screen.getByRole("button", { name: /επόμεν/i }));
    expect(screen.getByText(/λέξη 1\/10/i)).toBeDefined(); // not yet skipped
    await user.click(screen.getByRole("button", { name: /σίγουρα/i }));
    expect(screen.getByText(/λέξη 2\/11/i)).toBeDefined(); // the run grew by one step
  });

  it("a skipped word comes back as a second chance and can then be skipped for good", async () => {
    // Seed a round where αυγο was skipped first and the other 9 are solved —
    // the player lands directly on the second chance (click-solving all 9
    // through userEvent is too slow for the test timeout).
    localStorage.setItem("wordgames:state", JSON.stringify({
      leksodromia: {
        [PUZZLE.date]: {
          puzzleId: PUZZLE.date,
          wordIndex: 10,
          currentElapsedMs: 30_000,
          currentHintsUsed: 0,
          results: WORDS.slice(1).map((word) => ({
            word, status: "solved", elapsedMs: 1_000, hintsUsed: 0, points: 50,
          })),
          retries: { 10: { origIndex: 0, baseElapsedMs: 30_000, baseHints: 0 } },
        },
      },
    }));
    const user = userEvent.setup();
    renderBoard();
    // Second chance: αυγο's rack is back, badge shown.
    expect(screen.getByTestId("second-chance-badge")).toBeDefined();
    expect(screen.getByText(/λέξη 11\/11/i)).toBeDefined();
    await skipCurrentWord(user);                                    // final skip
    expect(screen.getByTestId("round-recap")).toBeDefined();
  });

  it("finishing the round shows a recap of all 10 words", async () => {
    const user = userEvent.setup();
    renderBoard();
    // First pass requeues all 10; the second pass of skips is final.
    for (let i = 0; i < WORDS.length * 2; i++) await skipCurrentWord(user);
    const recap = screen.getByTestId("round-recap");
    for (const word of WORDS) {
      expect(recap.textContent).toContain(word);
    }
  });

  it("posts the score as soon as it increases — no finish required", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, WORDS[0]); // auto-submits on the last tile
    expect(postScore).toHaveBeenCalledTimes(1);
    const [, body] = vi.mocked(postScore).mock.calls[0];
    expect(body).toMatchObject({ game_id: "leksodromia", puzzle_date: PUZZLE.date });
    expect((body as { score: number }).score).toBeGreaterThan(0);
  });

  it("skips never re-post (score unchanged); the round still ends after the second pass", async () => {
    const user = userEvent.setup();
    renderBoard();
    await pickWord(user, WORDS[0]);
    for (let i = 1; i < WORDS.length; i++) await skipCurrentWord(user); // requeue 9
    for (let i = 1; i < WORDS.length; i++) await skipCurrentWord(user); // final 9
    expect(screen.getByTestId("round-recap")).toBeDefined();
    expect(postScore).toHaveBeenCalledTimes(1); // only the solve moved the score
  });

  it("does not re-post when a finished round is restored from persistence", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      leksodromia: {
        [PUZZLE.date]: {
          puzzleId: PUZZLE.date,
          wordIndex: 10,
          currentElapsedMs: 0,
          currentHintsUsed: 0,
          results: WORDS.map((word) => ({
            word, status: "skipped", elapsedMs: 0, hintsUsed: 0, points: 0,
          })),
        },
      },
    }));
    renderBoard();
    expect(screen.getByTestId("round-recap")).toBeDefined();
    expect(postScore).not.toHaveBeenCalled();
  });
});

// ── PageClient ────────────────────────────────────────────────────────────────

describe("LeksodromiaPageClient", () => {
  it("renders the title, leaderboard trigger, and rules trigger", () => {
    render(<LeksodromiaPageClient puzzle={PUZZLE} today={PUZZLE.date} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Leksodromia");
    expect(screen.getByRole("button", { name: /πίνακας σκορ/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /πώς να παίξεις/i })).toBeDefined();
  });

  it("the rules modal explains the time decay", async () => {
    const user = userEvent.setup();
    render(<LeksodromiaPageClient puzzle={PUZZLE} today={PUZZLE.date} />);
    await user.click(screen.getByRole("button", { name: /πώς να παίξεις/i }));
    expect(screen.getAllByText(/πόντο/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/χρόνο/i).length).toBeGreaterThan(0);
  });
});
