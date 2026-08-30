// roundEnd.test.tsx — when Λεξιαρχείο's Result Panel appears (ADR 0025).
//
// Round End here is ALL FIVE LENGTHS RESOLVED — won *or* lost. Not "all won": a
// Length the player lost is resolved forever, so an all-won trigger would block
// the panel for the rest of the day. That ruling was made with the measurement on
// the table (7 of 35 player-days resolve all five) and the looser alternative was
// declined, so this test is the trigger, not a convenience.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LeksiarxeioBoard } from "@/components/leksiarxeio/LeksiarxeioBoard";
import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({
    deviceId:         "dev-1",
    displayName:      "Tester",
    leaderboardProps: { deviceId: "dev-1", displayName: "Tester" },
  }),
}));

vi.mock("@/hooks/useLeksiarxeioScoreSubmission", () => ({
  useLeksiarxeioScoreSubmission: () => ({ submitLength: vi.fn() }),
}));

const TODAY = "2026-08-17";
const LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];
const ANSWERS: Record<number, string> = {
  4: "καλο", 5: "καλοσ", 6: "καλοσυ", 7: "καλοσυν", 8: "καλοσυνη",
};

const PUZZLES: LeksiarxeioPuzzle[] = LENGTHS.map((length) => ({
  id:     `${TODAY}-wordle-${length}`,
  date:   TODAY,
  answer: ANSWERS[length],
  length,
}));

const WORD_LISTS = Object.fromEntries(
  LENGTHS.map((l) => [l, [ANSWERS[l]]]),
) as Record<LeksiarxeioLength, string[]>;

function seedSession(length: LeksiarxeioLength, status: "won" | "lost") {
  const answer = ANSWERS[length];
  const guesses =
    status === "won"
      ? [{ word: answer, tiles: Array(answer.length).fill("correct") }]
      : Array.from({ length: 6 }, () => ({
          word:  "μισσσσσσ".slice(0, answer.length),
          tiles: Array(answer.length).fill("absent"),
        }));

  const existing = JSON.parse(localStorage.getItem("wordgames:state") ?? "{}");
  localStorage.setItem(
    "wordgames:state",
    JSON.stringify({
      ...existing,
      leksiarxeio: {
        ...(existing.leksiarxeio ?? {}),
        [`${TODAY}-wordle-${length}`]: { guesses, status },
      },
    }),
  );
}

function renderBoard() {
  return render(
    <LeksiarxeioBoard
      puzzles={PUZZLES}
      wordLists={WORD_LISTS}
      today={TODAY}
      isLeaderboardOpen={false}
      onOpenLeaderboard={() => {}}
      onCloseLeaderboard={() => {}}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Leksiarxeio Round End", () => {
  it("shows no Result Panel while a Length is still unresolved", () => {
    for (const length of [4, 5, 6, 7] as LeksiarxeioLength[]) seedSession(length, "won");
    renderBoard();

    expect(screen.queryByTestId("leksiarxeio-result")).not.toBeInTheDocument();
  });

  it("shows the Result Panel once all five are resolved", () => {
    for (const length of LENGTHS) seedSession(length, "won");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toBeInTheDocument();
  });

  it("shows it on a lost Length too — resolved is not the same as won", () => {
    seedSession(4, "lost");
    for (const length of [5, 6, 7, 8] as LeksiarxeioLength[]) seedSession(length, "won");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toBeInTheDocument();
  });

  // The panel reports words FOUND, not Lengths reached — the whole point of the
  // 2026-08-21 copy change, and the reason it counts `won` rather than reusing
  // `resolvedRounds.length`, which is five on every Round End including this one.
  it("counts only the Lengths that were solved", () => {
    seedSession(4, "lost");
    seedSession(5, "lost");
    for (const length of [6, 7, 8] as LeksiarxeioLength[]) seedSession(length, "won");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toHaveTextContent("Βρήκες 3 λέξεις");
  });

  it("says «Βρήκες 1 λέξη» in the singular", () => {
    for (const length of [4, 5, 6, 7] as LeksiarxeioLength[]) seedSession(length, "lost");
    seedSession(8, "won");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toHaveTextContent("Βρήκες 1 λέξη");
  });

  it("says «Βρήκες 0 λέξεις» when every Length was lost", () => {
    for (const length of LENGTHS) seedSession(length, "lost");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toHaveTextContent("Βρήκες 0 λέξεις");
  });

  // The scoring and the board came back on 2026-08-30 (ADR 0028), so the panel
  // carries both again — the πόντοι heading and the link to the board.
  it("shows the score heading and the leaderboard link", () => {
    for (const length of LENGTHS) seedSession(length, "won");
    renderBoard();

    expect(screen.getByTestId("leksiarxeio-result")).toHaveTextContent(/πόντοι/i);
    expect(screen.getByRole("button", { name: /πίνακα σκορ/i })).toBeInTheDocument();
  });
});
