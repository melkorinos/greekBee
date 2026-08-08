import { describe, expect, it } from "vitest";

import {
  deriveBanner,
  guardSubmit,
  pivotFor,
  MIN_NOMINATION_NAME_LENGTH,
  MIN_NOMINATION_NOTE_LENGTH,
  type NominationBanner,
  type NominationFields,
} from "@/lib/nominationDecision";
import type { NominationLookup } from "@/lib/nominationDecision";

/** A clean lookup for ΑΓΑΠΗ; each case overrides only what it exercises. */
function lookup(over: Partial<NominationLookup> = {}): NominationLookup {
  return { word: "ΑΓΑΠΗ", blocked: false, rejected: 0, accepted: 0, pending: 0, pendingId: null, ...over };
}

/** Fields that satisfy both minimums; each case overrides what it exercises. */
function fields(over: Partial<NominationFields> = {}): NominationFields {
  return { name: "Νίκος", note: "είναι κοινή ελληνική λέξη", ...over };
}

describe("deriveBanner", () => {
  const cases: Array<[string, NominationLookup | null, string, NominationBanner]> = [
    ["no lookup yet",                 null,                                        "ΑΓΑΠΗ", null],
    ["clean word",                    lookup(),                                    "ΑΓΑΠΗ", null],
    ["blocked",                       lookup({ blocked: true }),                   "ΑΓΑΠΗ", "blocked"],
    ["rejected",                      lookup({ rejected: 1 }),                     "ΑΓΑΠΗ", "rejected"],
    ["accepted",                      lookup({ accepted: 1 }),                     "ΑΓΑΠΗ", "accepted"],
    ["pending",                       lookup({ pending: 1, pendingId: "p1" }),     "ΑΓΑΠΗ", "pending"],
    ["stale result — player typed on", lookup({ blocked: true }),                  "ΑΓΑΠΕΣ", null],
  ];

  it.each(cases)("%s → %s", (_label, lk, key, expected) => {
    expect(deriveBanner(lk, key)).toBe(expected);
  });

  // The ladder: each row stacks every hit below it, and the higher one must win.
  const ladder: Array<[string, NominationLookup, NominationBanner]> = [
    ["blocked outranks all",       lookup({ blocked: true, rejected: 1, accepted: 1, pending: 1, pendingId: "p1" }), "blocked"],
    ["rejected outranks accepted", lookup({ rejected: 1, accepted: 1, pending: 1, pendingId: "p1" }),                "rejected"],
    ["accepted outranks pending",  lookup({ accepted: 1, pending: 1, pendingId: "p1" }),                             "accepted"],
  ];

  it.each(ladder)("%s", (_label, lk, expected) => {
    expect(deriveBanner(lk, lk.word)).toBe(expected);
  });
});

describe("guardSubmit — word-level refusals", () => {
  it("lets a clean, fully filled-in nomination through", () => {
    expect(guardSubmit(lookup(), fields())).toEqual({ ok: true });
  });

  it("lets a word through when the lookup failed — the server's 422/409 is the backstop", () => {
    expect(guardSubmit(null, fields())).toEqual({ ok: true });
  });

  it("never posts a blocklisted word", () => {
    expect(guardSubmit(lookup({ blocked: true }), fields())).toEqual({ ok: false, reason: "blocked" });
  });

  it("blocks re-proposing an approved-but-unreleased word", () => {
    expect(guardSubmit(lookup({ accepted: 1 }), fields())).toEqual({ ok: false, reason: "accepted" });
  });

  it("pivots to the pending proposal instead of inserting a duplicate", () => {
    expect(guardSubmit(lookup({ pending: 1, pendingId: "p1" }), fields())).toEqual({
      ok: false, reason: "pending", pendingId: "p1",
    });
  });

  it("posts a pending word with no id — the DB backstop answers 409 with one", () => {
    expect(guardSubmit(lookup({ pending: 1, pendingId: null }), fields())).toEqual({ ok: true });
  });

  it("re-submits a rejected word — the explanation it wants is now demanded of everyone", () => {
    expect(guardSubmit(lookup({ rejected: 1 }), fields())).toEqual({ ok: true });
  });

  // A blocked word cannot be posted however it is filled in, so pointing the
  // player at the name field would send them off fixing the wrong thing.
  it("reports the word refusal, not the empty fields, when both apply", () => {
    expect(guardSubmit(lookup({ blocked: true }), fields({ name: "", note: "" })))
      .toEqual({ ok: false, reason: "blocked" });
  });
});

describe("guardSubmit — mandatory fields", () => {
  it("demands a name", () => {
    expect(guardSubmit(lookup(), fields({ name: "" }))).toEqual({ ok: false, reason: "name-required" });
  });

  it("treats a whitespace-only name as no name", () => {
    expect(guardSubmit(lookup(), fields({ name: "   " }))).toEqual({ ok: false, reason: "name-required" });
  });

  it("rejects a name one character below the minimum", () => {
    const short = "α".repeat(MIN_NOMINATION_NAME_LENGTH - 1);
    expect(guardSubmit(lookup(), fields({ name: short }))).toEqual({ ok: false, reason: "name-required" });
  });

  it("accepts a name exactly at the minimum", () => {
    const exact = "α".repeat(MIN_NOMINATION_NAME_LENGTH);
    expect(guardSubmit(lookup(), fields({ name: exact }))).toEqual({ ok: true });
  });

  it("demands an explanation on an otherwise clean word", () => {
    expect(guardSubmit(lookup(), fields({ note: "" }))).toEqual({ ok: false, reason: "note-required" });
  });

  it("treats a whitespace-only note as no note", () => {
    expect(guardSubmit(lookup(), fields({ note: "   " }))).toEqual({ ok: false, reason: "note-required" });
  });

  // The minimum is the point: a non-empty check would pass "ναι", which tells a
  // reviewer exactly as much as an empty field.
  it("rejects a note one character below the minimum", () => {
    const short = "α".repeat(MIN_NOMINATION_NOTE_LENGTH - 1);
    expect(guardSubmit(lookup(), fields({ note: short }))).toEqual({ ok: false, reason: "note-required" });
  });

  it("accepts a note exactly at the minimum", () => {
    const exact = "α".repeat(MIN_NOMINATION_NOTE_LENGTH);
    expect(guardSubmit(lookup(), fields({ note: exact }))).toEqual({ ok: true });
  });

  it("reports the missing name before the missing note", () => {
    expect(guardSubmit(lookup(), fields({ name: "", note: "" })))
      .toEqual({ ok: false, reason: "name-required" });
  });

  it("still demands the fields when the lookup failed entirely", () => {
    expect(guardSubmit(null, fields({ name: "" }))).toEqual({ ok: false, reason: "name-required" });
  });
});

describe("pivotFor", () => {
  it("reads 422 as a blocklisted word", () => {
    expect(pivotFor(422, "ΙΑΝΟΥΑΡΙΟΣ", null)).toEqual(lookup({ word: "ΙΑΝΟΥΑΡΙΟΣ", blocked: true }));
  });

  it("reads 409 as a pending duplicate, keeping the id the server returned", () => {
    expect(pivotFor(409, "ΑΓΑΠΗ", { pendingId: "p1" })).toEqual(lookup({ pending: 1, pendingId: "p1" }));
  });

  it("survives a 409 with an unreadable body", () => {
    expect(pivotFor(409, "ΑΓΑΠΗ", null)).toEqual(lookup({ pending: 1, pendingId: null }));
  });

  it("ignores statuses that are not a refusal it knows", () => {
    expect(pivotFor(500, "ΑΓΑΠΗ", null)).toBeNull();
    expect(pivotFor(200, "ΑΓΑΠΗ", null)).toBeNull();
  });
});
