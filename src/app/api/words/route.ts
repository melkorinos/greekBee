// POST /api/words — record a device's valid word finds and return its fresh count.
//
// Storage = append-only fact rows (ADR 0013 lane C): one row per word a device
// found on one puzzle_date. Writing is INSERT ... ON CONFLICT
// (device_uuid, puzzle_date, word) DO NOTHING — modelled via supabase upsert with
// ignoreDuplicates: true — so a re-submitted find is a no-op (retry-/Offline-Lock-
// safe) and the same word on a different day counts again.
//
// The server runs ZERO validation against a puzzle: it only writes the words the
// client posts, shape-bounded by sanitizeFoundWords (junk is permanent on this
// open-RLS append-forever table). It DOES stamp `length` server-side from the
// normalized word — the per-length read (player_words_by_length) aggregates on that
// column so it never has to fetch rows, which matters because word rows grow far
// faster than any other fact table on the platform.
//
// Open RLS mirrors player_pangrams' anon access. Leksokipos-only today; a later
// cross-game extension is a `game_id` column value, not a rewrite.

import { NextResponse, type NextRequest } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib/puzzle";
import { sanitizeFoundWords } from "@/games/leksokipos/lib/words";
import { WORDS_MIN_TRACKED } from "@/lib/wordsByLength";

export const runtime = "edge";

interface WordsPayload {
  device_uuid: string;
  puzzle_date: string;
  words:       unknown;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<WordsPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid, puzzle_date, words } = parsed.body;

  if (!device_uuid || typeof puzzle_date !== "string" || !isISODate(puzzle_date)) {
    return jsonMessage("Missing or invalid fields");
  }

  // Only long words are tracked: finds below the ≥10 floor are not stored at all
  // (a word that long is itself a one-shot badge; the profile card counts them per
  // length). This keeps player_words — the fastest-growing fact table — small, and
  // the floor is DERIVED from the badge-length ladder so it can never drift from the
  // card/badges (achievementTuning.wordLengthBadges).
  const clean = sanitizeFoundWords(words).filter((w) => w.length >= WORDS_MIN_TRACKED);
  const supabase = getSupabaseClient();

  if (clean.length > 0) {
    const rows = clean.map((word) => ({ device_uuid, puzzle_date, word, length: word.length }));
    const { error } = await table(supabase, "player_words").upsert(
      rows,
      { onConflict: "device_uuid,puzzle_date,word", ignoreDuplicates: true },
    );
    if (error) return jsonError("db_error", error.message);
  }

  // Fresh lifetime count for the device — HEAD exact count, no rows transferred.
  const { count, error } = await table(supabase, "player_words")
    .select("*", { count: "exact", head: true })
    .eq("device_uuid", device_uuid);

  if (error) return jsonError("db_error", error.message);

  return NextResponse.json({ count: count ?? 0 });
}
