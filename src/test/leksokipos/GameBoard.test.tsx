// Component tests for GameBoard — tests real user interactions using RTL.
// Verifies that clicking hexes, typing, submitting and error messages all work.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { SOUND_CUES, SOUND_PREFERENCE_KEY } from "@/config/sound";
import { GameBoard } from "@/components/leksokipos/GameBoard";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { RANKS } from "@/games/leksokipos/lib/ranking";
import userEvent from "@testing-library/user-event";

// GameBoard calls useDayChange → useRouter; provide a stub so it doesn't throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// GameBoard wires useAuth into its leaderboard modal (ADR 0012 visibility rule);
// stub it to a stable anonymous state so these game-interaction tests don't touch Supabase.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authLinked:       false,
    authUserName:     null,
    signInWithGoogle: vi.fn(async () => {}),
    signOut:          vi.fn(async () => {}),
    isLoading:        false,
  }),
}));

// ── Test fixture ───────────────────────────────────────────────────────────────

const puzzle: LeksokiposPuzzle = {
  id: "test-puzzle",
  language: "el",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords: ["anti", "paid", "paint", "painted", "panted", "patina"],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Render GameBoard and return userEvent instance (pointer + keyboard) */
function setup() {
  const user = userEvent.setup();
  render(<GameBoard puzzle={puzzle} />);
  return { user };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("GameBoard rendering", () => {
  it("renders the game board container", () => {
    setup();
    expect(screen.getByTestId("game-board")).toBeInTheDocument();
  });

  it("renders Delete, Shuffle buttons (no submit button when input is empty)", () => {
    setup();
    expect(screen.getByTestId("btn-delete")).toBeInTheDocument();
    expect(screen.getByTestId("btn-shuffle")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-enter")).toBeNull();
  });

  it("shows the inline submit button once the input reaches 4 letters", async () => {
    const { user } = setup();
    // Type 3 letters — button should still be absent
    await user.keyboard("pai");
    expect(screen.queryByTestId("btn-enter")).toBeNull();
    // Type the 4th letter — button should appear
    await user.keyboard("n");
    expect(screen.getByTestId("btn-enter")).toBeInTheDocument();
  });

  it("renders the score bar with the starting rank", () => {
    setup();
    expect(screen.getByTestId("rank-label")).toHaveTextContent(RANKS[0].name);
    expect(screen.getByTestId("score-label")).toHaveTextContent("0 pts");
  });

  it("renders the found words list empty at start", () => {
    setup();
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("0");
  });
});

// ── Keyboard input ─────────────────────────────────────────────────────────────

describe("Keyboard input", () => {
  it("types puzzle letters into the word input", async () => {
    const { user } = setup();
    await user.keyboard("pain");
    // All 4 letters should appear as word-input-letter spans
    const letters = screen.getAllByTestId("word-input-letter");
    expect(letters).toHaveLength(4);
  });

  it("ignores letters not in the puzzle", async () => {
    const { user } = setup();
    await user.keyboard("z"); // z is not in the puzzle
    expect(screen.queryAllByTestId("word-input-letter")).toHaveLength(0);
  });

  it("deletes the last letter on Backspace", async () => {
    const { user } = setup();
    await user.keyboard("pai");
    await user.keyboard("{Backspace}");
    expect(screen.getAllByTestId("word-input-letter")).toHaveLength(2);
  });

  it("ignores letters typed as a browser shortcut (Ctrl/⌘/Alt held)", async () => {
    const { user } = setup();
    // Each combo delivers a bare letter in e.key ("a"/"p"/"i") — without a modifier
    // guard these land in the input as if the player had typed them.
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Meta>}p{/Meta}");
    await user.keyboard("{Alt>}i{/Alt}");
    expect(screen.queryAllByTestId("word-input-letter")).toHaveLength(0);
  });
});

// ── Word submission ────────────────────────────────────────────────────────────

describe("Word submission", () => {
  it("accepts a valid word and adds it to found words", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}");
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");
    expect(screen.getByTestId("feedback-word-accepted")).toBeInTheDocument();
  });

  it("shows an error when word is too short", async () => {
    const { user } = setup();
    await user.keyboard("ant{Enter}");
    expect(screen.getByTestId("feedback-error-too_short")).toBeInTheDocument();
  });

  it("shows an error when word is missing the centre letter", async () => {
    const { user } = setup();
    await user.keyboard("pint{Enter}");
    expect(screen.getByTestId("feedback-error-missing_center")).toBeInTheDocument();
  });

  it("shows an error when word is not in the word list", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    expect(screen.getByTestId("feedback-error-not_in_list")).toBeInTheDocument();
  });

  it("shows an error when word was already found", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}");
    await user.keyboard("paint{Enter}");
    expect(screen.getByTestId("feedback-error-already_found")).toBeInTheDocument();
  });

  it("highlights pangram submission", async () => {
    const { user } = setup();
    await user.keyboard("painted{Enter}");
    expect(screen.getByTestId("feedback-pangram")).toBeInTheDocument();
  });

  it("updates the score after a valid word", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}"); // 5 pts
    expect(screen.getByTestId("score-label")).toHaveTextContent("5 pts");
  });
});

// ── Button interactions ────────────────────────────────────────────────────────

describe("Button interactions", () => {
  it("Delete button removes the last typed letter", async () => {
    const { user } = setup();
    await user.keyboard("pai");
    await user.click(screen.getByTestId("btn-delete"));
    expect(screen.getAllByTestId("word-input-letter")).toHaveLength(2);
  });

  it("Enter button submits the current word", async () => {
    const { user } = setup();
    await user.keyboard("anti"); // use a different word than other tests
    await user.click(screen.getByTestId("btn-enter"));
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");
  });
});

// ── Word suggestion flow ───────────────────────────────────────────────────────

describe("Word suggestion flow", () => {
  function mockFetch(ok: boolean) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok,
      json: async () => ({ ok }),
    } as Response);
  }

  it("shows the suggest button after a not_in_list submission", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}"); // not in validWords
    expect(screen.getByTestId("feedback-suggest-btn")).toBeInTheDocument();
  });

  it("opens the suggest modal when the suggest button is clicked", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    await user.click(screen.getByTestId("feedback-suggest-btn"));
    expect(screen.getByTestId("nomination-modal")).toBeInTheDocument();
  });

  it("shows confirmation feedback after a successful suggestion", async () => {
    mockFetch(true);
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    await user.click(screen.getByTestId("feedback-suggest-btn"));
    // The in-game flag goes through the same mandatory name + explanation as the
    // Leksikastirio form — the rule is the modal's, not one screen's.
    await user.clear(screen.getByTestId("nomination-modal-name"));
    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.type(screen.getByTestId("nomination-modal-note"), "υπάρχει στο λεξικό");
    await user.click(screen.getByTestId("nomination-modal-submit"));
    // modal closes immediately on success; feedback area shows confirmation
    await waitFor(() =>
      expect(screen.getByTestId("feedback-just-suggested")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("feedback-just-suggested")).toHaveTextContent("PANDA");
  });

  it("shows 'Ήδη υποβλήθηκε' for a word already suggested in a previous session", async () => {
    // Pre-seed localStorage as if the word was suggested before
    const { writeSlice, readSlice } = await import("@/hooks/useGameStore");
    const existing = readSlice<string[]>("suggestions") ?? [];
    writeSlice("suggestions", [...existing, "panda"]);

    const { user } = setup();
    await user.keyboard("panda{Enter}");
    expect(screen.getByTestId("feedback-already-suggested")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-suggest-btn")).toBeNull();
  });
});

// ── Give-up ───────────────────────────────────────────────────────────────────

describe("Give-up flow", () => {
  it("shows give-up button below the found-words list for daily puzzles", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    expect(screen.getByTestId("btn-give-up")).toBeInTheDocument();
  });

  it("does NOT show give-up button for custom puzzles", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "custom-a-pinteδ", date: "2026-05-20" }} />);
    expect(screen.queryByTestId("btn-give-up")).toBeNull();
  });

  it("clicking give-up opens the confirmation modal", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    expect(screen.getByTestId("btn-give-up-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("btn-give-up-cancel")).toBeInTheDocument();
  });

  it("cancelling give-up closes the modal and restores the give-up button", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-cancel"));
    expect(screen.getByTestId("btn-give-up")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-give-up-confirm")).toBeNull();
  });

  it("confirming give-up shows the game-over banner and missed-words list in modal", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("give-up-banner")).toBeInTheDocument());
    // missed-words-list appears both in the open modal and on the main page
    expect(screen.getAllByTestId("missed-words-list").length).toBeGreaterThan(0);
  });

  it("hides the honeycomb and action buttons after confirming give-up", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("give-up-banner")).toBeInTheDocument());
    expect(screen.queryByTestId("btn-delete")).toBeNull();
    expect(screen.queryByTestId("btn-shuffle")).toBeNull();
  });

  it("missed-words list excludes already-found words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    // Find a word first
    await user.keyboard("anti{Enter}");
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    // missed-words-list appears in both the open modal and on the main page
    await waitFor(() => expect(screen.getAllByTestId("missed-words-list").length).toBeGreaterThan(0));
    // "anti" should not appear in any missed list
    screen.getAllByTestId("missed-words-list").forEach((list) => {
      expect(list).not.toHaveTextContent("anti");
    });
  });
});

// ── Puzzle navigation (givenUp bleed regression) ──────────────────────────────
// Regression: Next.js App Router reuses the GameBoard instance when navigating
// between /leksokipos/[center]/[outer] URLs. Without key={puzzle.id} the
// useReducer state (including givenUp:true) would persist to the next puzzle.

describe("Puzzle navigation", () => {
  // Wrap GameBoard with key={activePuzzle.id} — mirrors what LeksokiposLayout does.
  function KeyedWrapper({ activePuzzle }: { activePuzzle: LeksokiposPuzzle }) {
    return <GameBoard key={activePuzzle.id} puzzle={activePuzzle} />;
  }

  const dailyA: LeksokiposPuzzle = { ...puzzle, id: "2026-05-20-el", date: "2026-05-20" };
  const dailyB: LeksokiposPuzzle = { ...puzzle, id: "2026-05-21-el", date: "2026-05-21" };

  it("does not carry givenUp state to a different puzzle", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<KeyedWrapper activePuzzle={dailyA} />);

    // Give up on puzzle A
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("give-up-banner")).toBeInTheDocument());

    // Navigate to puzzle B (key change → remount)
    rerender(<KeyedWrapper activePuzzle={dailyB} />);

    // Puzzle B must start fresh — no give-up banner, action buttons visible
    expect(screen.queryByTestId("give-up-banner")).toBeNull();
    expect(screen.getByTestId("btn-delete")).toBeInTheDocument();
    expect(screen.getByTestId("btn-shuffle")).toBeInTheDocument();
  });

  it("does not carry foundWords to a different puzzle", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<KeyedWrapper activePuzzle={dailyA} />);

    await user.keyboard("paint{Enter}");
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");

    rerender(<KeyedWrapper activePuzzle={dailyB} />);

    expect(screen.getByTestId("found-words-count")).toHaveTextContent("0");
    expect(screen.getByTestId("score-label")).toHaveTextContent("0 pts");
  });
});

// ── Endgame Zone ──────────────────────────────────────────────────────────────
// Fixture: validWords raw total = 33 → maxScore = ceil(33 × 0.85) = 29.
// Endgame unlocks at the TOP RANK (Απολυτότητα, 80% of maxScore → score ≥ 24),
// NOT at a perfect score. painted(14)+panted(6)+paint(5) = 25 pts reaches the
// top rank while still below max (29), leaving anti/paid/patina remaining.

const dailyPuzzle: LeksokiposPuzzle = { ...puzzle, id: "2026-05-20-el", date: "2026-05-20" };

/** Submit a sequence of space-separated words via keyboard. */
async function submitWords(user: ReturnType<typeof userEvent.setup>, words: string[]) {
  for (const w of words) {
    await user.keyboard(`${w}{Enter}`);
  }
}

describe("Endgame Zone", () => {
  it("endgame panel appears the moment the player reaches the top rank (Απολυτότητα), before a perfect score", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, ["painted", "panted", "paint"]); // 25 pts: top rank, but < maxScore (29)
    // Sanity: still below max score, so this is the transition zone the bug missed.
    expect(screen.getByTestId("score-label")).toHaveTextContent("25 pts");
    await user.click(screen.getByRole("button", { name: /εμφάνιση λέξεων/i }));
    expect(screen.getByTestId("endgame-panel")).toBeInTheDocument();
  });

  it("endgame panel also appears at/above max score on a daily puzzle", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, ["painted", "panted", "paint", "patina"]); // 31 pts >= 29
    await user.click(screen.getByRole("button", { name: /εμφάνιση λέξεων/i }));
    expect(screen.getByTestId("endgame-panel")).toBeInTheDocument();
  });

  it("endgame panel shows correct remaining word total and pangram count", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, ["painted", "panted", "paint", "patina"]); // leaves anti, paid
    await user.click(screen.getByRole("button", { name: /εμφάνιση λέξεων/i }));
    const panel = screen.getByTestId("endgame-panel");
    expect(panel).toHaveTextContent("2");  // remainingTotal
    expect(panel).toHaveTextContent("0");  // remainingPangrams
  });

  it("endgame panel does NOT appear for custom (non-daily) puzzles even at max score", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={puzzle} />); // custom id — isDailyPuzzle = false
    await submitWords(user, ["painted", "panted", "paint", "patina"]);
    await user.click(screen.getByRole("button", { name: /εμφάνιση επιπέδων/i }));
    expect(screen.queryByTestId("endgame-panel")).toBeNull();
  });

  it("rank ladder still appears below the top rank (Απολυτότητα)", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    // maxScore here is 25 (raw 33 × SCORE_SCALE 0.75), so the top rank sits at 20 pts.
    // 16 pts = 64% — comfortably mid-ladder, which is what this test needs.
    await submitWords(user, ["painted", "paid", "anti"]); // 16 pts: 64% < 80% → not top rank
    expect(screen.getByTestId("score-label")).toHaveTextContent("16 pts");
    await user.click(screen.getByRole("button", { name: /εμφάνιση επιπέδων/i }));
    expect(screen.queryByTestId("endgame-panel")).toBeNull();
    // rank ladder rows are present (at least one rank name visible)
    expect(screen.getByText("Ψαράκι 🐟")).toBeInTheDocument();
  });
});

// ── All words found (completion state) ────────────────────────────────────────

describe("All words found — completion state", () => {
  const allWords = ["anti", "paid", "paint", "painted", "panted", "patina"];

  it("shows ΤΟ ΠΕΘΑΝΕΣ message after finding every word", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, allWords);
    expect(screen.getByTestId("perfect-message")).toBeInTheDocument();
    expect(screen.getByTestId("perfect-message")).toHaveTextContent("ΤΟ ΠΕΘΑΝΕΣ");
  });

  it("hides WordInput and action buttons after finding all words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, allWords);
    expect(screen.queryByTestId("word-input")).toBeNull();
    expect(screen.queryByTestId("btn-delete")).toBeNull();
    expect(screen.queryByTestId("btn-shuffle")).toBeNull();
  });

  it("keyboard input is ignored after finding all words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, allWords);
    await user.keyboard("p");
    expect(screen.queryByTestId("word-input-letter")).toBeNull();
  });

  it("give-up button is absent after finding all words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, allWords);
    expect(screen.queryByTestId("btn-give-up")).toBeNull();
  });

  it("endgame panel shows 0 remaining words after finding all words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={dailyPuzzle} />);
    await submitWords(user, allWords);
    await user.click(screen.getByRole("button", { name: /εμφάνιση λέξεων/i }));
    const panel = screen.getByTestId("endgame-panel");
    expect(panel).toHaveTextContent("Λέξεις που απομένουν");
    // remaining total cell should show 0
    expect(panel.querySelectorAll("div")[0]).toHaveTextContent("0");
  });
});

// ── God Mode ──────────────────────────────────────────────────────────────────

describe("God Mode", () => {
  describe("without ?godmode param", () => {
    it("🧪 button is absent", () => {
      render(<GameBoard puzzle={dailyPuzzle} />);
      expect(screen.queryByTestId("btn-god-mode")).toBeNull();
    });

    it("god mode panel is absent", () => {
      render(<GameBoard puzzle={dailyPuzzle} />);
      expect(screen.queryByTestId("god-mode-panel")).toBeNull();
    });
  });

  describe("with ?godmode=zzkdgr3", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "?godmode=zzkdgr3");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    it("🧪 button is present", () => {
      render(<GameBoard puzzle={dailyPuzzle} />);
      expect(screen.getByTestId("btn-god-mode")).toBeInTheDocument();
    });

    it("god mode panel is in the DOM (off-screen until opened)", () => {
      render(<GameBoard puzzle={dailyPuzzle} />);
      expect(screen.getByTestId("god-mode-panel")).toBeInTheDocument();
    });

    it("clicking 🧪 opens the panel (backdrop appears)", async () => {
      const user = userEvent.setup();
      render(<GameBoard puzzle={dailyPuzzle} />);
      await user.click(screen.getByTestId("btn-god-mode"));
      // Backdrop only renders when isOpen=true
      expect(document.querySelector(".fixed.inset-0.bg-black\\/20")).toBeInTheDocument();
    });

    it("'Βρες Όλες' injects all words and triggers completion", async () => {
      const user = userEvent.setup();
      render(<GameBoard puzzle={dailyPuzzle} />);
      await user.click(screen.getByTestId("btn-god-mode"));
      await user.click(screen.getByRole("button", { name: /Βρες Όλες$/ }));
      expect(screen.getByTestId("perfect-message")).toBeInTheDocument();
    });

    it("'Βρες Όλες-1' injects all-but-last words and does not trigger completion", async () => {
      const user = userEvent.setup();
      render(<GameBoard puzzle={dailyPuzzle} />);
      await user.click(screen.getByTestId("btn-god-mode"));
      await user.click(screen.getByText(/βρες Όλες-1/i));
      expect(screen.queryByTestId("perfect-message")).toBeNull();
      expect(screen.getByTestId("found-words-count")).toHaveTextContent(
        String(dailyPuzzle.validWords.length - 1),
      );
    });

    it("Reset restores blank state after injection", async () => {
      const user = userEvent.setup();
      render(<GameBoard puzzle={dailyPuzzle} />);
      await user.click(screen.getByTestId("btn-god-mode"));
      await user.click(screen.getByText(/βρες Όλες-1/i));
      await user.click(within(screen.getByTestId("god-mode-panel")).getByText(/reset/i));
      expect(screen.getByTestId("found-words-count")).toHaveTextContent("0");
      expect(screen.getByTestId("score-label")).toHaveTextContent("0 pts");
    });

    it("wrong param value does NOT activate god mode", () => {
      window.history.pushState({}, "", "?godmode=wrong");
      render(<GameBoard puzzle={dailyPuzzle} />);
      expect(screen.queryByTestId("btn-god-mode")).toBeNull();
    });

    // Regression: god mode must be OFF in the server-rendered markup even with the
    // param present, so the SSR HTML matches the initial hydration render. Reading
    // window in a useState initializer put the button in the client's first render
    // but not the server's → hydration mismatch. renderToStaticMarkup exercises the
    // real SSR path (getServerSnapshot), so this fails on the buggy version.
    it("🧪 is absent from server-rendered markup (no hydration mismatch)", () => {
      const html = renderToStaticMarkup(<GameBoard puzzle={dailyPuzzle} />);
      expect(html).not.toContain("btn-god-mode");
    });
  });
});

// ── Leaderboard button location ────────────────────────────────────────────────

describe("Leaderboard button", () => {
  it("renders inside ScoreBar (next to score) for daily puzzles", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    const scoreBar = screen.getByTestId("score-bar");
    expect(scoreBar.querySelector('[data-testid="btn-leaderboard"]')).toBeInTheDocument();
  });

  it("is absent for non-daily (custom) puzzles", () => {
    setup();
    expect(screen.queryByTestId("btn-leaderboard")).toBeNull();
  });
});

// ── Offline Mode day-boundary banner ──────────────────────────────────────────

describe("GameBoard — day changed while Offline Mode is active", () => {
  // The puzzle rotates at 03:00. Offline Mode suppresses useDayChange's redirect
  // (the force-dynamic page could not load without a connection), so the board must
  // explain the staleness instead of silently serving yesterday's puzzle.

  it("shows the unlock banner when the day rolled over offline", async () => {
    vi.resetModules();
    vi.doMock("@/games/leksokipos/hooks/useDayChange", () => ({
      useDayChange: () => ({ dayChangedWhileOffline: true }),
    }));
    const { GameBoard: Board } = await import("@/components/leksokipos/GameBoard");

    render(<Board puzzle={puzzle} />);

    expect(screen.getByText(/άλλαξε/i)).toBeInTheDocument();
    vi.doUnmock("@/games/leksokipos/hooks/useDayChange");
  });

  it("shows no banner on a normal round", () => {
    setup();
    expect(screen.queryByText(/άλλαξε/i)).not.toBeInTheDocument();
  });
});

// ── Sound Cues ────────────────────────────────────────────────────────────────
// ADR 0021. The reducer emits nothing; an effect keyed on lastSubmission selects
// the Cue and plays it. These tests assert WHICH file plays, never that a sound
// is audible — nothing in this stack can assert that.

describe("Sound Cues", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  /** Oscillators started — the only observable a synth Cue leaves behind. */
  let blips: number;

  beforeEach(() => {
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    // wordFound is synthesized rather than a file, and jsdom has no AudioContext
    // at all (probed, not assumed), so stub the slice the hook calls and count
    // oscillators. As everywhere else here: this pins WHICH moment makes a noise,
    // never that the noise is audible.
    blips = 0;
    const noop = () => {};
    vi.stubGlobal("AudioContext", class {
      state = "running";
      currentTime = 0;
      destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() {
        return {
          type: "", frequency: { setValueAtTime: noop }, connect: noop,
          start: () => { blips += 1; }, stop: noop,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: noop, linearRampToValueAtTime: noop,
            exponentialRampToValueAtTime: noop,
          },
          connect: noop,
        };
      }
    });
  });

  afterEach(() => {
    playSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  /** The src of every Audio element play() was called on, in order. */
  function playedSources() {
    return (playSpy.mock.contexts as HTMLAudioElement[]).map((a) => a.src);
  }

  function enableSound() {
    localStorage.setItem(SOUND_PREFERENCE_KEY, "on");
  }

  it("plays the pangram Cue on a pangram — and only that one", async () => {
    enableSound();
    const { user } = setup();
    await user.keyboard("painted{Enter}");

    const played = playedSources();
    expect(played).toHaveLength(1);
    expect(played[0]).toContain(SOUND_CUES.pangram.src);
    // Never the rooster layered over the word blip — that sounds like a bug.
    expect(blips).toBe(0);
  });

  it("plays the word-found Cue on a valid non-pangram", async () => {
    enableSound();
    const { user } = setup();
    await user.keyboard("paint{Enter}");

    expect(blips).toBe(1);
    expect(playSpy).not.toHaveBeenCalled(); // synthesized: no file is fetched
  });

  it("plays the missing-centre Cue when the centre letter is forgotten", async () => {
    enableSound();
    const { user } = setup();
    await user.keyboard("pint{Enter}");

    expect(playedSources()).toEqual([expect.stringContaining(SOUND_CUES.missingCenter.src)]);
  });

  it("stays silent on the rejections that have no Cue", async () => {
    enableSound();
    const { user } = setup();
    await user.keyboard("panda{Enter}"); // not_in_list — the most common rejection
    await user.keyboard("ant{Enter}");   // too_short

    expect(playSpy).not.toHaveBeenCalled();
    expect(blips).toBe(0);
  });

  it("stays silent for every Cue while the preference is off", async () => {
    // No enableSound() — the default. A player who never opts in hears nothing
    // and fetches nothing.
    const { user } = setup();
    await user.keyboard("painted{Enter}");
    await user.keyboard("paint{Enter}");
    await user.keyboard("pint{Enter}");

    expect(playSpy).not.toHaveBeenCalled();
    expect(blips).toBe(0);
  });

  it("stays silent while typing — entering letters is not a Cue", async () => {
    // Considered and rejected: a per-keystroke tick reads as keyboard feedback,
    // and the Cues are for outcomes. Nothing sounds until a word is submitted.
    enableSound();
    const { user } = setup();
    await user.keyboard("paint");
    await user.click(screen.getByRole("button", { name: "Letter P" }));

    expect(blips).toBe(0);
    expect(playSpy).not.toHaveBeenCalled();
  });
});
