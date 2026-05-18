// POST /api/suggest-word — stub endpoint for word suggestions.
//
// Receives a word the player believes should be in the valid-word list,
// along with an optional player name and note.
//
// TODO: when the Supabase backend is set up for the leaderboard, wire this to
// insert a row into the `word_suggestions` table instead of console.log.
//
// Payload: { word: string, playerName?: string, note?: string }

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      word:        string;
      playerName?: string;
      note?:       string;
    };

    const { word, playerName, note } = body;

    if (!word || typeof word !== "string") {
      return NextResponse.json({ ok: false, error: "Missing word" }, { status: 400 });
    }

    // Stub: log to server output until the real backend is wired.
    console.log("[word-suggestion]", {
      word:       word.trim(),
      playerName: playerName?.trim() || "(anonymous)",
      note:       note?.trim()       || "(no note)",
      timestamp:  new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
