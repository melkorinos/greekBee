// Unit tests for the MissedWordsList component.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MissedWordsList } from "@/components/leksokipos/MissedWordsList";
import type { SpellingBeePuzzle } from "@/games/leksokipos/types";

const puzzle: SpellingBeePuzzle = {
  id: "test-missed",
  language: "el",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  // "painted" is the pangram (uses all 7 letters)
  validWords: ["anti", "paid", "paint", "painted", "panted", "patina"],
};

describe("MissedWordsList", () => {
  it("renders the container with testid", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={[]} />);
    expect(screen.getByTestId("missed-words-list")).toBeInTheDocument();
  });

  it("shows all words when nothing was found", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={[]} />);
    expect(screen.getByTestId("missed-words-count")).toHaveTextContent("6");
  });

  it("excludes found words from the missed list", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={["anti", "paid"]} />);
    expect(screen.getByTestId("missed-words-count")).toHaveTextContent("4");
    expect(screen.queryByText("anti")).toBeNull();
    expect(screen.queryByText("paid")).toBeNull();
  });

  it("shows 'Βρήκες τα πάντα' when all words are found", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={puzzle.validWords} />);
    expect(screen.getByText(/Βρήκες τα πάντα/)).toBeInTheDocument();
    expect(screen.getByTestId("missed-words-count")).toHaveTextContent("0");
  });

  it("highlights pangrams with the pangram testid", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={[]} />);
    // "painted" uses all 7 letters — it is the pangram
    expect(screen.getByTestId("missed-word-pangram")).toHaveTextContent("painted");
  });

  it("shows non-pangram words with the regular testid", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={[]} />);
    const regular = screen.getAllByTestId("missed-word");
    const words = regular.map((el) => el.textContent);
    expect(words).toContain("anti");
    expect(words).not.toContain("painted");
  });

  it("sorts missed words alphabetically", () => {
    render(<MissedWordsList puzzle={puzzle} foundWords={[]} />);
    // Collect all word chips in order
    const chips = [
      ...screen.getAllByTestId("missed-word"),
      ...screen.getAllByTestId("missed-word-pangram"),
    ].map((el) => el.textContent ?? "").sort(); // sort for stable comparison
    const expected = [...puzzle.validWords].sort();
    expect(chips).toEqual(expected);
  });
});
