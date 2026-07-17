import { describe, expect, it } from "vitest";

import {
  deriveBanner,
  guardSubmit,
  pivotFor,
  type NominationBanner,
  type NominationLookup,
} from "@/lib/nominationDecision";

/** A clean lookup for ΑΓΑΠΗ; each case overrides only what it exercises. */
function lookup(over: Partial<NominationLookup> = {}): NominationLookup {
  return { word: "ΑΓΑΠΗ", blocked: false, rejected: 0, accepted: 0, pending: 0, pendingId: null, ...over };
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

describe("guardSubmit", () => {
  it("lets a clean word through", () => {
    expect(guardSubmit(lookup(), "")).toEqual({ ok: true });
  });

  it("lets a word through when the lookup failed — the server's 422/409 is the backstop", () => {
    expect(guardSubmit(null, "")).toEqual({ ok: true });
  });

  it("never posts a blocklisted word", () => {
    expect(guardSubmit(lookup({ blocked: true }), "μια εξήγηση")).toEqual({ ok: false, reason: "blocked" });
  });

  it("demands an explanation before re-submitting a rejected word", () => {
    expect(guardSubmit(lookup({ rejected: 1 }), "")).toEqual({ ok: false, reason: "note-required" });
  });

  it("treats a whitespace-only note as no note", () => {
    expect(guardSubmit(lookup({ rejected: 1 }), "   ")).toEqual({ ok: false, reason: "note-required" });
  });

  it("re-submits a rejected word once explained", () => {
    expect(guardSubmit(lookup({ rejected: 1 }), "είναι κοινή λέξη")).toEqual({ ok: true });
  });

  it("blocks re-proposing an approved-but-unreleased word", () => {
    expect(guardSubmit(lookup({ accepted: 1 }), "")).toEqual({ ok: false, reason: "accepted" });
  });

  it("pivots to the pending proposal instead of inserting a duplicate", () => {
    expect(guardSubmit(lookup({ pending: 1, pendingId: "p1" }), "")).toEqual({
      ok: false, reason: "pending", pendingId: "p1",
    });
  });

  it("posts a pending word with no id — the DB backstop answers 409 with one", () => {
    expect(guardSubmit(lookup({ pending: 1, pendingId: null }), "")).toEqual({ ok: true });
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
