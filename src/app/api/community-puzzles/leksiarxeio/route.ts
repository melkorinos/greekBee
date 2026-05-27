// POST /api/community-puzzles/leksiarxeio — submit a community Leksiarxeio puzzle.
// GET  /api/community-puzzles/leksiarxeio?status=pending — list (admin only).
//
// A submission carries one word per length (4–8), validated against each Word Pool.
// All 5 lengths are required; if any word is not in its pool the whole submission
// is rejected with per-word errors so the player can fix or nominate the word.
//
// Admin authentication: GET requires X-Admin-Secret header matching ADMIN_SECRET env var.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";

export const runtime = "edge";

const LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];

// ── POST ──────────────────────────────────────────────────────────────────────

interface SubmitPayload {
  submitter_name?: string;
  words: Record<string, string>; // {"4": "word", "5": "word", ...}
}

export async function POST(req: NextRequest) {
  let body: SubmitPayload;
  try {
    body = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submitter_name = "", words } = body;

  if (!words || typeof words !== "object") {
    return NextResponse.json({ error: "words is required" }, { status: 400 });
  }

  // Validate all 5 lengths are present and in their Word Pool
  const errors: Record<string, string> = {};
  for (const len of LENGTHS) {
    const word = (words[String(len)] ?? "").trim().toLowerCase();
    if (!word) {
      errors[String(len)] = "Απαιτείται λέξη";
      continue;
    }
    const pool = getValidWords(len);
    if (!pool.includes(word)) {
      errors[String(len)] = "Η λέξη δεν βρίσκεται στη λίστα";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const data = Object.fromEntries(
    LENGTHS.map((len) => [String(len), (words[String(len)] ?? "").trim().toLowerCase()])
  );

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("community_leksiarxeio_puzzles") as any).insert({
    submitter_name: submitter_name.trim(),
    data,
    status: "pending",
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

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("community_leksiarxeio_puzzles") as any)
    .select("id, submitter_name, data, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ puzzles: data ?? [] });
}
