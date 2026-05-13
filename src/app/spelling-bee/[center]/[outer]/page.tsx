// /spelling-bee/[center]/[outer] — custom puzzle route.
//
// Anyone can construct a URL with any 7 Greek letters and get a fully playable
// Spelling Bee game.  Valid words are computed on the server at request time
// from the full Greek word list, so no operator pre-curation is needed.
//
// URL shape: /spelling-bee/α/βγδεζηθ
//   [center] — exactly 1 Greek letter (the mandatory center letter)
//   [outer]  — exactly 6 Greek letters (the outer ring, order doesn't matter)
//
// The resulting Puzzle object is identical in shape to a curated one, so the
// entire existing game stack (GameBoard, reducer, persistence) works unchanged.

import { notFound, redirect } from "next/navigation";

import { buildCustomPuzzle } from "@/data";
import { parseCustomUrl } from "@/games/spelling-bee/lib/parseCustomUrl";
import { GameBoard } from "@/components/spelling-bee/GameBoard";
import { HowToPlayModal } from "@/components/spelling-bee/HowToPlayModal";
import { NewPuzzleButton } from "@/components/spelling-bee/NewPuzzleButton";
import { ShareButton } from "@/components/spelling-bee/ShareButton";
import type { Language } from "@/types";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomSpellingBeePage({
  params,
}: {
  params: Promise<{ center: string; outer: string }>;
}) {
  const { center: rawCenter, outer: rawOuter } = await params;

  const parsed = parseCustomUrl(rawCenter, rawOuter);
  if (!parsed) notFound();

  // Canonical URL uses the already-normalised (accent-free) letters.
  // If the raw URL differs (e.g. player typed an accented letter like ά),
  // redirect to the clean canonical form so bookmarks + shared links are consistent.
  const canonicalOuter = parsed.outer.join("");
  const canonicalCenter = parsed.center;
  if (
    decodeURIComponent(rawCenter) !== canonicalCenter ||
    decodeURIComponent(rawOuter)  !== canonicalOuter
  ) {
    redirect(`/spelling-bee/${canonicalCenter}/${canonicalOuter}`);
  }

  const language: Language = "el";
  const puzzle = buildCustomPuzzle(parsed.center, parsed.outer, language);

  // The share URL is built from the normalised letters so it is always accent-free.
  // Using an absolute URL requires knowing the origin; we use a path-only URL here
  // and ShareButton will prepend window.location.origin on the client.
  const canonicalPath = `/spelling-bee/${canonicalCenter}/${canonicalOuter}`;

  // Warn the player if the letter combo yields very few valid words
  const tooFewWords = puzzle.validWords.length < 5;

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans min-h-screen">
      <header className="w-full border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">🍯 Spelling Bee</h1>
          <div className="flex items-center gap-2">
            <ShareButton canonicalPath={canonicalPath} />
            <NewPuzzleButton puzzleId={puzzle.id} language={language} />
            <HowToPlayModal />
          </div>
        </div>
      </header>
      {tooFewWords && (
        <div className="w-full max-w-sm mx-auto mt-3 px-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            This letter combination has very few valid words. Try a different set!
          </p>
        </div>
      )}
      <div className="flex flex-1 w-full flex-col items-center bg-white">
        <GameBoard puzzle={puzzle} />
      </div>
    </div>
  );
}

// Generate a human-readable title for the browser tab
export async function generateMetadata({
  params,
}: {
  params: Promise<{ center: string; outer: string }>;
}) {
  const { center, outer } = await params;
  const parsed = parseCustomUrl(center, outer);
  if (!parsed) return { title: "Spelling Bee" };

  const letters = [parsed.center.toUpperCase(), ...parsed.outer.map((l) => l.toUpperCase())].join("");
  return {
    title: `Spelling Bee — ${letters}`,
    description: `Custom Spelling Bee puzzle with center letter ${parsed.center.toUpperCase()} and outer letters ${parsed.outer.map((l) => l.toUpperCase()).join(", ")}`,
  };
}
