// POST /api/community-puzzles/vrestifrasi — submit a community phrase.
// GET  /api/community-puzzles/vrestifrasi?status=pending — list (admin only).
//
// Submission: one phrase string. Validated: 3–4 words, each word 2–8 letters,
// each word in the word pool or function word allowlist.
//
// Admin auth: GET requires X-Admin-Secret header matching ADMIN_SECRET env var.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { normalizeLetters } from "@/lib/normalize";
import { FUNCTION_WORD_ALLOWLIST } from "@/games/vrestifrasi/lib/functionWordAllowlist";
import words4 from "@/data/leksiarxeio/words-4.json";
import words5 from "@/data/leksiarxeio/words-5.json";
import words6 from "@/data/leksiarxeio/words-6.json";
import words7 from "@/data/leksiarxeio/words-7.json";
import words8 from "@/data/leksiarxeio/words-8.json";

export const runtime = "edge";

const WORD_POOL: Record<number, Set<string>> = {
  4: new Set(words4 as string[]),
  5: new Set(words5 as string[]),
  6: new Set(words6 as string[]),
  7: new Set(words7 as string[]),
  8: new Set(words8 as string[]),
};

function isValidPhraseWord(word: string): boolean {
  if (word.length < 2 || word.length > 8) return false;
  if (FUNCTION_WORD_ALLOWLIST.has(word)) return true;
  return WORD_POOL[word.length]?.has(word) ?? false;
}

// ── POST ──────────────────────────────────────────────────────────────────────

interface SubmitPayload {
  submitter_name?: string;
  phrase: string;
}

export async function POST(req: NextRequest) {
  let body: SubmitPayload;
  try {
    body = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submitter_name = "", phrase } = body;

  if (!phrase || typeof phrase !== "string") {
    return NextResponse.json({ error: "phrase is required" }, { status: 400 });
  }

  const normalizedPhrase = phrase.trim();
  const rawWords = normalizedPhrase.split(/\s+/).filter(Boolean);
  const words    = rawWords.map((w) => normalizeLetters(w));

  if (words.length < 3 || words.length > 4) {
    return NextResponse.json(
      { error: "Η φράση πρέπει να έχει 3–4 λέξεις" },
      { status: 422 },
    );
  }

  const wordErrors: Record<string, string> = {};
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length < 2 || w.length > 8) {
      wordErrors[String(i)] = `Κάθε λέξη πρέπει να έχει 2–8 γράμματα`;
    } else if (!isValidPhraseWord(w)) {
      wordErrors[String(i)] = `"${rawWords[i]}" δεν βρέθηκε στη λίστα`;
    }
  }

  if (Object.keys(wordErrors).length > 0) {
    return NextResponse.json({ errors: wordErrors }, { status: 422 });
  }

  // Store in display form (original casing with accents)
  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("community_vrestifrasi_puzzles") as any).insert({
    submitter_name: (submitter_name ?? "").trim(),
    data:           { phrase: normalizedPhrase },
    status:         "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET (admin) ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") ?? "";
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status   = req.nextUrl.searchParams.get("status") ?? "pending";
  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("community_vrestifrasi_puzzles") as any)
    .select("id, submitter_name, data, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ puzzles: data ?? [] });
}
