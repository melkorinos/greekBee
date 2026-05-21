// POST /api/suggest-word — inserts a word suggestion into Supabase.
//
// Receives a word the player believes should be in the valid-word list,
// along with an optional player name, note, and the device's anonymous UUID.
//
// Payload: { word: string, playerName?: string, note?: string, deviceId: string }

import { NextRequest, NextResponse } from "next/server";
import { WordSuggestionInsert, getSupabaseClient } from "@/lib/supabase";

// Run on the Edge runtime — avoids Fluid (Node.js) CPU billing.
// This route is a thin Supabase insert with no Node.js-only dependencies.
// Edge CPU is billed against a separate free tier from Fluid Active CPU.
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      word:        string;
      playerName?: string;
      note?:       string;
      deviceId:    string;
    };

    const { word, playerName, note, deviceId } = body;

    if (!word || typeof word !== "string") {
      return NextResponse.json({ ok: false, error: "Missing word" }, { status: 400 });
    }
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing deviceId" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const row: WordSuggestionInsert = {
      word:        word.trim().toLowerCase(),
      player_name: playerName?.trim() || null,
      note:        note?.trim()       || null,
      device_id:   deviceId,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("word_suggestions") as any).insert(row);

    if (error) {
      console.error("[word-suggestion] Supabase insert error:", (error as { message: string }).message);
      return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
