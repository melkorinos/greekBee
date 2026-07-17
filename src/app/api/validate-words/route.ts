// POST /api/validate-words — checks a batch of words against the Greek dictionary.
//
// Body:   { words: string[] }
// Returns { invalid: string[] }  — the subset (de-duplicated, lowercased) that is
//                                  NOT in the dictionary.
//
// Why this exists: the Stavrolekso maker needs to flag slots whose assembled
// answer isn't a real word. Importing the 811k-word dictionary into the client
// would ship a ~20 MB JS chunk to every visitor of /stavrolekso/maker. Keeping
// the word list server-side moves that cost off the wire entirely.
//
// Node runtime (not edge): the dictionary JSON is far larger than the edge
// bundle limit, so it must load in a Node serverless/Fluid function. The Set is
// built once per warm instance at module scope, so repeat requests pay no cost.

import { NextRequest, NextResponse } from "next/server";

import { parseJson } from "@/lib/apiRoute";
import wordsEl from "@/data/words-el.json";

export const runtime = "nodejs";

const WORD_SET = new Set((wordsEl as string[]).map((w) => w.toLowerCase()));

export async function POST(req: NextRequest) {
  const parsed = await parseJson<{ words?: unknown }>(req);
  if (!parsed.ok) return parsed.response;

  const words = Array.isArray(parsed.body?.words) ? parsed.body.words : [];

  const unique = new Set(
    words
      .filter((w): w is string => typeof w === "string")
      .map((w) => w.toLowerCase()),
  );

  const invalid = [...unique].filter((w) => !WORD_SET.has(w));

  return NextResponse.json({ invalid });
}
