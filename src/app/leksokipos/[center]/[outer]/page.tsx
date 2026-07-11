// /leksokipos/[center]/[outer] — custom puzzle route.
//
// Anyone can construct a URL with any 7 Greek letters and get a fully playable
// Leksokipos game.  Valid words are computed on the server at request time
// from the full Greek word list, so no operator pre-curation is needed.
//
// URL shape (canonical): /leksokipos/k/aeiost
//   [center] — exactly 1 greeklish letter (the mandatory center letter)
//   [outer]  — exactly 6 greeklish letters (the outer ring, order doesn't matter)
//
// Greeklish encoding: 1 Latin letter ↔ 1 Greek letter, bijective, no digraphs.
// Greek percent-encoded URLs (e.g. %CE%BA) are also accepted and 301-redirected
// to the greeklish canonical form so old bookmarks continue to work.
//
// The resulting Puzzle object is identical in shape to a pre-built one, so the
// entire existing game stack (GameBoard, reducer, persistence) works unchanged.

import { buildCustomPuzzle, getPrebuiltPuzzleByLetters, getRecentPuzzleDates } from "@/data";
import { notFound, redirect } from "next/navigation";

import type { Language } from "@/types";
import { LeksokiposLayout } from "@/components/leksokipos/LeksokiposLayout";
import { getPrebuiltPuzzleParams } from "@/data/leksokipos/puzzleIndex";
import { greekToGreeklish } from "@/lib/greeklish";
import { parseCustomUrl } from "@/games/leksokipos/lib/parseCustomUrl";

// Cache each unique letter-combo page for 1 week.
// The word list and puzzle data never change between deploys — and a deploy
// purges the CDN cache anyway — so a long window is safe.
//
// Why this matters for cost:
//   `computeValidWords` scans 811 k words (~50-200 ms of Fluid CPU) for every
//   custom combo not in the pre-built list.  Without caching, every page visit
//   would trigger a fresh Fluid invocation and be billed accordingly.
//   With revalidate=604800, the CDN serves cached HTML for repeat visitors;
//   the Fluid function only runs for the *first* visitor in each week window
//   (was 1 hour — 24×+ more regenerations for zero freshness benefit).
//
// Note: revalidate on a dynamic route only takes effect for requests that reach
// the server — the redirect() calls above return instantly and are unaffected.
export const revalidate = 604800;

// Prerender every prebuilt puzzle combo at build time (Fluid CPU: the CDN then
// serves all daily-puzzle traffic — the dominant Fluid burner — for free).
// dynamicParams stays at its default (true) so user-invented custom combos
// still render on demand under the revalidate window above. New puzzles only
// arrive via deploy, and a deploy rebuilds everything — the set can't go stale.
export function generateStaticParams() {
  return getPrebuiltPuzzleParams("el");
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomLeksokiposPage({
  params,
}: {
  params: Promise<{ center: string; outer: string }>;
}) {
  const { center: rawCenter, outer: rawOuter } = await params;

  const parsed = parseCustomUrl(rawCenter, rawOuter);
  if (!parsed) notFound();

  // Canonical URL uses greeklish (plain ASCII) — e.g. /leksokipos/k/aeiost.
  // Redirect if raw params are not already in greeklish canonical form
  // (handles: old percent-encoded Greek URLs, accented letters, uppercase, etc.).
  const canonicalCenter = greekToGreeklish(parsed.center);
  const canonicalOuter  = greekToGreeklish(parsed.outer.join(""));
  if (
    decodeURIComponent(rawCenter) !== canonicalCenter ||
    decodeURIComponent(rawOuter)  !== canonicalOuter
  ) {
    // Greeklish is pure ASCII — no encodeURIComponent needed.
    redirect(`/leksokipos/${canonicalCenter}/${canonicalOuter}`);
  }

  const language: Language = "el";
  // Use the pre-built puzzle if the letters match a known daily puzzle.
  // This preserves the real puzzle ID (e.g. "2026-05-18-el") so GameBoard
  // can enable the leaderboard 🏆 button for daily puzzles.
  const puzzle =
    getPrebuiltPuzzleByLetters(parsed.center, parsed.outer, language) ??
    (await buildCustomPuzzle(parsed.center, parsed.outer, language));

  // Last 7 daily puzzle dates (newest-first) — passed to GameBoard so the
  // leaderboard can render the rolling day-strip without a client-side import.
  const recentPuzzleDates = getRecentPuzzleDates(7, language);

  // The share URL is the greeklish canonical path — pure ASCII, human-readable.
  // ShareButton will prepend window.location.origin on the client.
  const canonicalPath = `/leksokipos/${canonicalCenter}/${canonicalOuter}`;

  // Warn the player if the letter combo yields very few valid words
  const tooFewWords = puzzle.validWords.length < 5;

  return (
    <div data-game="leksokipos" className="flex flex-col flex-1 items-center justify-start bg-background font-sans min-h-screen">
      <LeksokiposLayout
        puzzle={puzzle}
        recentPuzzleDates={recentPuzzleDates}
        canonicalPath={canonicalPath}
        tooFewWords={tooFewWords}
      />
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
  if (!parsed) return { title: "Leksokipos" };

  const letters = [parsed.center.toUpperCase(), ...parsed.outer.map((l) => l.toUpperCase())].join("");
  return {
    title: `Leksokipos — ${letters}`,
    description: `Custom Leksokipos puzzle with center letter ${parsed.center.toUpperCase()} and outer letters ${parsed.outer.map((l) => l.toUpperCase()).join(", ")}`,
  };
}
