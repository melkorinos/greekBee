// POST /api/pangrams — record a device's pangram finds and return its fresh count.
//
// Storage = append-only fact rows (ADR 0013 lane C): one row per pangram word a
// device found on one puzzle_date. Writing is INSERT ... ON CONFLICT
// (device_uuid, puzzle_date, word) DO NOTHING — modelled via supabase upsert with
// ignoreDuplicates: true — so a re-submitted find is a no-op (retry-/Offline-Lock-
// safe) and the same word on a different day counts again (B2/R1: count = COUNT(*),
// never COUNT(DISTINCT word)).
//
// The server runs ZERO detection: it returns the device's lifetime COUNT(*) and the
// client decides tier crossings (detectEarnedPangramTiers). No id whitelist is
// possible for arbitrary words on this open-RLS table, so junk is bounded by shape
// (sanitizePangramWords) instead. Open RLS mirrors game_state's anon access.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib/puzzle";
import { sanitizePangramWords } from "@/games/leksokipos/lib/pangrams";

export const runtime = "edge";

interface PangramPayload {
  device_uuid: string;
  puzzle_date: string;
  words:       unknown;
}

export async function POST(req: NextRequest) {
  let body: PangramPayload;
  try {
    body = (await req.json()) as PangramPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid, puzzle_date, words } = body;

  if (!device_uuid || typeof puzzle_date !== "string" || !isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const clean = sanitizePangramWords(words);
  const supabase = getSupabaseClient();

  if (clean.length > 0) {
    const rows = clean.map((word) => ({ device_uuid, puzzle_date, word }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("player_pangrams") as any).upsert(
      rows,
      { onConflict: "device_uuid,puzzle_date,word", ignoreDuplicates: true },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fresh lifetime count for the device — HEAD exact count, no rows transferred.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase.from("player_pangrams") as any)
    .select("*", { count: "exact", head: true })
    .eq("device_uuid", device_uuid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
