// leksokipos/page.tsx — redirects to the letter-based canonical URL for
// today's puzzle (/leksokipos/[center]/[outer]).
//
// Why redirect instead of rendering here?
// The letter URL IS the shareable link. If someone shares it, the recipient
// gets the exact same puzzle regardless of which day they open it.
// Having the letters in the address bar also means the share button on the
// custom-puzzle page can just copy window.location.href — no special logic needed.
//
// ?random=1&exclude=<id> → redirect to a random puzzle's letter URL
// ?puzzle=<id>           → redirect to that specific puzzle's letter URL

import { getPuzzleForDate, getRandomPuzzle, getTodaysPuzzle } from "@/data";

import type { Language } from "@/types";
import { greekToGreeklish } from "@/lib/greeklish";
import { redirect } from "next/navigation";

export default async function LeksokiposPage({
  searchParams,
}: {
  searchParams: Promise<{ puzzle?: string; random?: string; exclude?: string }>;
}) {
  const { puzzle: puzzleId, random, exclude } = await searchParams;
  const language: Language = "el";

  const puzzle =
    puzzleId ? getPuzzleForDate(puzzleId, language)
    : random  ? getRandomPuzzle(language, exclude)
    :           getTodaysPuzzle(language);

  // Redirect to the greeklish canonical URL — plain ASCII, no percent-encoding needed.
  // Greeklish avoids ERR_INVALID_CHAR in Location headers and produces clean shared links.
  redirect(
    `/leksokipos/${greekToGreeklish(puzzle.centerLetter)}/${
      greekToGreeklish(puzzle.outerLetters.join(""))
    }`,
  );
}
