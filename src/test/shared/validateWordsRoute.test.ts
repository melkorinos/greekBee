// validateWordsRoute.test.ts — unit tests for POST /api/validate-words
//
// The route checks a batch of words against the Greek dictionary and returns the
// subset that is unknown. We stub the dictionary so the test is fast and stable
// regardless of the real word list's contents.

import { describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

// Stub the dictionary import the route relies on.
vi.mock("@/data/words-el.json", () => ({
  default: ["καλημερα", "σπιτι", "νερο"],
}));

const { POST } = await import("@/app/api/validate-words/route");

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/validate-words", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

describe("POST /api/validate-words", () => {
  it("returns only the words missing from the dictionary", async () => {
    const res  = await POST(makePostReq({ words: ["καλημερα", "ζζζζ", "νερο", "ωωωω"] }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(new Set(json.invalid)).toEqual(new Set(["ζζζζ", "ωωωω"]));
  });

  it("is case-insensitive and de-duplicates input", async () => {
    const res  = await POST(makePostReq({ words: ["ΚΑΛΗΜΕΡΑ", "ΖΖΖΖ", "ζζζζ"] }));
    const json = await res.json();
    expect(json.invalid).toEqual(["ζζζζ"]);
  });

  it("returns an empty list when all words are known", async () => {
    const res  = await POST(makePostReq({ words: ["σπιτι", "νερο"] }));
    const json = await res.json();
    expect(json.invalid).toEqual([]);
  });

  it("tolerates a missing or non-array words field", async () => {
    const res  = await POST(makePostReq({}));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.invalid).toEqual([]);
  });

  it("400s on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/validate-words", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
