// Seam (a) — the split-mapping planner for the Topothesies data pipeline.
//
// planDissolve is pure: it takes the Kallikratis municipality records plus a
// per-unit override map and decides which TARGET entry each municipality
// dissolves into. It never touches geometry — that is mapshaper's job. The
// contract it guards (handoff-01 "Island splits"):
//   • a municipality with an override peels into its own island entry
//   • a municipality with no override dissolves into its regional-unit target
//     (so Deferred islands that SHARE a parent municipality stay inside the
//      parent — they simply have no override)
//   • a dropped municipality (Troizinia-Methana) is excluded from every target
//   • the Confirmed splits produce EXACTLY the locked island id set

import { describe, it, expect } from "vitest";

import { planDissolve } from "../../../scripts/lib/topothesies/planDissolve";
import type { MunicipalityRecord } from "../../../scripts/lib/topothesies/planDissolve";

// Default target id for an un-overridden municipality = a slug of its unit.
const unitToTargetId = (unit: string) => unit;

// ── Attica "Islands" regional unit (Νήσων): 7 island peels + 1 dropped ────────
const atticaIslands: MunicipalityRecord[] = [
  { name: "Δήμος Αίγινας", regionalUnit: "attica-islands" },
  { name: "Δήμος Αγκιστρίου", regionalUnit: "attica-islands" },
  { name: "Δήμος Ύδρας", regionalUnit: "attica-islands" },
  { name: "Δήμος Κυθήρων", regionalUnit: "attica-islands" },
  { name: "Δήμος Πόρου", regionalUnit: "attica-islands" },
  { name: "Δήμος Σαλαμίνας", regionalUnit: "attica-islands" },
  { name: "Δήμος Σπετσών", regionalUnit: "attica-islands" },
  { name: "Δήμος Τροιζηνίας-Μεθάνων", regionalUnit: "attica-islands" },
];

const atticaOverrides: Record<string, string> = {
  "Δήμος Αίγινας": "aegina",
  "Δήμος Αγκιστρίου": "agistri",
  "Δήμος Ύδρας": "hydra",
  "Δήμος Κυθήρων": "kythira",
  "Δήμος Πόρου": "poros",
  "Δήμος Σαλαμίνας": "salamis",
  "Δήμος Σπετσών": "spetses",
};

describe("planDissolve — Attica Islands split", () => {
  const plan = planDissolve(atticaIslands, {
    overrides: atticaOverrides,
    drops: ["Δήμος Τροιζηνίας-Μεθάνων"],
    unitToTargetId,
  });

  it("peels each island municipality into its own island entry", () => {
    expect(plan.assignments["Δήμος Αίγινας"]).toBe("aegina");
    expect(plan.assignments["Δήμος Σπετσών"]).toBe("spetses");
  });

  it("produces exactly the 7 locked island targets (no unit remainder)", () => {
    expect(plan.targetIds).toEqual(
      ["aegina", "agistri", "hydra", "kythira", "poros", "salamis", "spetses"].sort(),
    );
  });

  it("drops Troizinia-Methana from every target", () => {
    expect(plan.assignments["Δήμος Τροιζηνίας-Μεθάνων"]).toBeUndefined();
    expect(plan.dropped).toContain("Δήμος Τροιζηνίας-Μεθάνων");
    expect(plan.targetIds).not.toContain("attica-islands");
  });
});

// ── Mainland remainder + peeled islands (Magnesia → +Sporades) ────────────────
describe("planDissolve — mainland remainder keeps the un-overridden municipalities", () => {
  const magnesia: MunicipalityRecord[] = [
    { name: "Δήμος Βόλου", regionalUnit: "magnesia" },
    { name: "Δήμος Ρήγα Φεραίου", regionalUnit: "magnesia" },
    { name: "Δήμος Σκιάθου", regionalUnit: "magnesia" },
    { name: "Δήμος Σκοπέλου", regionalUnit: "magnesia" },
    { name: "Δήμος Αλοννήσου", regionalUnit: "magnesia" },
  ];
  const plan = planDissolve(magnesia, {
    overrides: {
      "Δήμος Σκιάθου": "skiathos",
      "Δήμος Σκοπέλου": "skopelos",
      "Δήμος Αλοννήσου": "alonnisos",
    },
    drops: [],
    unitToTargetId,
  });

  it("dissolves the two mainland municipalities into the remainder unit target", () => {
    expect(plan.assignments["Δήμος Βόλου"]).toBe("magnesia");
    expect(plan.assignments["Δήμος Ρήγα Φεραίου"]).toBe("magnesia");
  });

  it("peels the three Sporades into their own entries", () => {
    expect(plan.targetIds).toEqual(
      ["alonnisos", "magnesia", "skiathos", "skopelos"].sort(),
    );
  });
});

// ── Deferred island stays inside its parent (no override) ─────────────────────
describe("planDissolve — Deferred islands stay inside the parent shape", () => {
  // Lesser Cyclades share the Naxos municipality, so there is no separate
  // municipality to override — they are simply absorbed into naxos.
  const naxos: MunicipalityRecord[] = [
    { name: "Δήμος Νάξου και Μικρών Κυκλάδων", regionalUnit: "naxos" },
    { name: "Δήμος Αμοργού", regionalUnit: "naxos" },
  ];
  const plan = planDissolve(naxos, {
    overrides: { "Δήμος Αμοργού": "amorgos" },
    drops: [],
    unitToTargetId,
  });

  it("keeps Lesser Cyclades inside naxos (parent municipality, no peel)", () => {
    expect(plan.assignments["Δήμος Νάξου και Μικρών Κυκλάδων"]).toBe("naxos");
    expect(plan.targetIds).toEqual(["amorgos", "naxos"]);
  });
});

// ── A drop wins over a stray override, and unknown drops are ignored ──────────
describe("planDissolve — drop precedence", () => {
  it("drops a municipality even if an override also lists it", () => {
    const plan = planDissolve(
      [{ name: "X", regionalUnit: "u" }],
      { overrides: { X: "x-island" }, drops: ["X"], unitToTargetId },
    );
    expect(plan.assignments["X"]).toBeUndefined();
    expect(plan.dropped).toContain("X");
    expect(plan.targetIds).toEqual([]);
  });
});
