// spelling-bee/page.tsx — redirects to the letter-based canonical URL for
// today's puzzle (/spelling-bee/[center]/[outer]).
//
// Why redirect instead of rendering here?
// The letter URL IS the shareable link. If someone shares it, the recipient
// gets the exact same puzzle regardless of which day they open it.
// Having the letters in the address bar also means the share button on the
// custom-puzzle page can just copy window.location.href — no special logic needed.
//
// ?random=1&exclude=<id> → redirect to a random puzzle's letter URL (used by NewPuzzleButton)
// ?puzzle=<id>           → redirect to that specific puzzle's letter URL

import { getPuzzleById, getRandomPuzzle, getTodaysPuzzle } from "@/data";

import type { Language } from "@/types";
import { redirect } from "next/navigation";

export default async function SpellingBeePage({
  searchParams,
}: {
  searchParams: Promise<{ puzzle?: string; random?: string; exclude?: string }>;
}) {
  const { puzzle: puzzleId, random, exclude } = await searchParams;
  const language: Language = "el";

  const puzzle =
    puzzleId ? (getPuzzleById(puzzleId, language) ?? getTodaysPuzzle(language))
    : random  ? getRandomPuzzle(language, exclude)
    :           getTodaysPuzzle(language);

  // Redirect to the canonical letter URL — this becomes the address bar URL
  // and is the shareable link that works on any future date.
  // Letters must be percent-encoded: raw Unicode in an HTTP Location header is
  // rejected by Node.js with ERR_INVALID_CHAR.
  redirect(
    `/spelling-bee/${encodeURIComponent(puzzle.centerLetter)}/${
      encodeURIComponent(puzzle.outerLetters.join(""))
    }`,
  );
}
