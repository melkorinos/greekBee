// trackerReferences.test.ts
// Guards two tracker rules that were prose-only until 2026-08-15, and were each
// broken while nobody was watching:
//
//   1. "The folder is the state" — a doc that names TICKET-NN or ISSUE-NN must
//      name one that exists. Four docs carried tickets that had shipped, been
//      split, or never been listed (README called TICKET-05 a deploy blocker
//      after a flag replaced the gate; goals.md carried a dependency that had
//      dissolved; TICKET-11 was on disk and in no table).
//   2. "Numbers are never reused" — CLAUDE.md says read log.md before picking a
//      number, not the folder. Reading the folder is exactly how a spent number
//      gets reused, because shipped files are deleted, so the folder always looks
//      free. Git history then holds two different things under one id.
//
// The SPENT ledger below is the authoritative record of retired numbers. It used
// to exist only as scattered prose in memory.md, goals.md and log.md rows — which
// is the same "one fact, four copies" problem this test was written to stop. Add
// a row here when a tracker file is deleted; never remove one.
//
// Deliberately NOT governed: log.md, docs/adr/ and .claude/aiHelper/docsAudit/.
// Those are dated history — an ADR naming the ticket that implemented it, or a
// session log naming what it shipped, is a true statement about the past and must
// stay readable after the file is deleted. This test governs the docs a cold
// session reads as CURRENT STATE.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");
const TRACKER = ".claude/tracker";

/** Retired ids: shipped-and-deleted, or withdrawn. Append-only — never reuse. */
const SPENT: Record<string, string> = {
  "TICKET-01": "player_milestones — shipped s139",
  "TICKET-02": "badge catalog rebuild — shipped s140",
  "TICKET-03": "badge art — shipped s144",
  "TICKET-04": "Sound Cue primitive — shipped s146",
  "TICKET-06": "hidden-is-not-wip — shipped s148",
  "TICKET-07": "privacy page — shipped s149",
  "TICKET-08": "error monitoring / ADR 0023 — shipped s150",
  "TICKET-09": "row-count alert — closed s150, substitution accepted",
  // Code shipped s160/s163; the last three boxes were a look at the deployed card,
  // which the operator closed on 2026-08-17 by ruling that verification rides the
  // release-day deploy rather than holding a ticket open.
  "TICKET-10": "share preview + platform mark — shipped s163, closed 2026-08-17",
  "ISSUE-02": "game_state DELETE flake — deleted 2026-08-14, mechanism now a comment in the suite",
  // Used twice already, which is why this ledger exists: first for the
  // env-local/CI issue, then for the game_state DELETE flake (the same finding
  // as ISSUE-02), deleted 2026-08-14. Verified against `git log --diff-filter=D`.
  "ISSUE-04": "env-local masks CI env absence, then the game_state DELETE flake",
  "ISSUE-08": "stale display_name on game_scores — fixed 2026-08-15, names now resolve at read time",
  // Folded into ISSUE-01 on 2026-08-16, not shipped. The operator asked for one DB
  // issue rather than four; each became a section there, keeping its own trigger.
  // §2 itself is gone as of 2026-08-17 — TICKET-14 measured the crossover and the
  // existing indexes were already right. ISSUE-01 keeps sections 1 and 3 at their
  // numbers rather than renumbering, because ADR 0011/0026 and TICKET-13 cite them.
  "ISSUE-06": "player_profiles sequential scans — folded into ISSUE-01 §2, discharged 2026-08-17",
  "ISSUE-07": "nominations grow without bound — folded into ISSUE-01 §3",
  // NOT folded, despite what this entry said until 2026-08-16. ISSUE-01 has no
  // §4 and never had one: the finding was FIXED in 2f4cf77 the same day the fold
  // happened, which removed the write end to end. Corrected rather than annotated
  // because a pointer at a section that does not exist sends a cold session hunting.
  "ISSUE-09": "unread Leksokipos score metadata — fixed 2026-08-16 in 2f4cf77, never folded",
  "ISSUE-10": "leksodromia board.test.tsx timeouts — fixed 2026-08-17, userEvent delay:null",
  // Withdrawn, not shipped: the ticket was gated on ~500 daily players and the
  // re-measure on 2026-08-17 read 3-9. Kept as a two-line note in the project-mcp
  // skill so a session that rediscovers the update ratios stops there.
  "TICKET-12": "Leksokipos per-word write volume — withdrawn 2026-08-17, two orders below its gate",
  // Asked once, answered once, no script committed (its own scope said so). Both
  // planner questions resolved on 2026-08-17 against a local scratch database:
  // ISSUE-01 §2 discharged and deleted, §3's index verdict written into runbook
  // step 5. The two operator decisions it was parking moved back into §3.
  "TICKET-13": "migration rehearsal loop — shipped 2026-08-17, npm run db:rehearse",
  "TICKET-14": "index crossover probe — measured 2026-08-17, ISSUE-01 §2 discharged",
  // Both MP3s committed, provenance recorded, FEATURE_FLAGS.soundCues flipped on
  // 2026-08-17. What was left when the file was deleted is the operator's own ear
  // check on a phone plus the 320 px header look — a live watch, already carried by
  // reflections.md, not work an agent can hold a ticket open for.
  "TICKET-05": "Sound Cue assets — shipped 2026-08-17, closed 2026-08-18",
  "TICKET-16": "Leksokipos button icons — shipped 2026-08-18",
};

/**
 * Docs a cold session reads as current state. History files are excluded above.
 * Handoffs and tracker files are globbed so a new one is governed automatically.
 */
function governedFiles(): string[] {
  const fixed = [
    "README.md",
    "CONTEXT.md",
    "CLAUDE.md",
    ".claude/aiHelper/memory.md",
    ".claude/aiHelper/goals.md",
    ".claude/aiHelper/reflections.md",
  ].filter((rel) => existsSync(resolve(ROOT, rel)));

  const globbed = [".claude/handoffs", `${TRACKER}/issues`, `${TRACKER}/tickets`, TRACKER].flatMap(
    (dir) => {
      const abs = resolve(ROOT, dir);
      if (!existsSync(abs)) return [];
      return readdirSync(abs, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => `${dir}/${e.name}`);
    },
  );

  return [...fixed, ...globbed];
}

/** Every TICKET-NN / ISSUE-NN id that has a file on disk right now. */
function idsOnDisk(): Set<string> {
  const ids = new Set<string>();
  for (const dir of [`${TRACKER}/issues`, `${TRACKER}/tickets`]) {
    const abs = resolve(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const match = /^((?:TICKET|ISSUE)-\d+)-[a-z0-9-]+\.md$/.exec(name);
      if (match) ids.add(match[1]);
    }
  }
  return ids;
}

const REFERENCE = /\b(TICKET|ISSUE)-\d+\b/g;

describe("tracker references — the folder is the state, and numbers are never reused", () => {
  const files = governedFiles();
  const onDisk = idsOnDisk();

  it("scans the governed docs and finds references (guard is actually running)", () => {
    expect(files.length).toBeGreaterThan(8);
    const total = files.reduce(
      (n, rel) => n + (readFileSync(resolve(ROOT, rel), "utf8").match(REFERENCE)?.length ?? 0),
      0,
    );
    expect(total).toBeGreaterThan(10);
  });

  it("every tracker file follows the TICKET-NN-slug.md / ISSUE-NN-slug.md convention", () => {
    const bad: string[] = [];
    for (const dir of [`${TRACKER}/issues`, `${TRACKER}/tickets`]) {
      const abs = resolve(ROOT, dir);
      if (!existsSync(abs)) continue;
      const expected = dir.endsWith("issues") ? "ISSUE" : "TICKET";
      for (const name of readdirSync(abs)) {
        if (name === "README.md" || name === "domain.md") continue;
        if (!new RegExp(`^${expected}-\\d+-[a-z0-9-]+\\.md$`).test(name)) bad.push(`${dir}/${name}`);
      }
    }
    expect(bad, `Tracker files must be named ${"<TYPE>"}-NN-slug.md:\n${bad.join("\n")}`).toEqual(
      [],
    );
  });

  it("no doc names a tracker item that is neither on disk nor recorded as spent", () => {
    const dangling: string[] = [];

    for (const rel of files) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      for (const id of new Set(src.match(REFERENCE) ?? [])) {
        if (onDisk.has(id) || id in SPENT) continue;
        dangling.push(`${rel} → ${id}`);
      }
    }

    expect(
      dangling,
      "A current-state doc names a tracker item with no file on disk.\n" +
        "Either the item shipped (delete the reference and add the id to SPENT in this test),\n" +
        "or the reference is wrong. Do NOT re-create the file to satisfy this.\n" +
        dangling.join("\n"),
    ).toEqual([]);
  });

  it("no spent number has been reused by a live tracker file", () => {
    const reused = [...onDisk].filter((id) => id in SPENT).map((id) => `${id} — spent: ${SPENT[id]}`);

    expect(
      reused,
      "A retired tracker number has been reused, so git history now holds two different\n" +
        "items under one id. CLAUDE.md: numbers are never reused — read log.md before\n" +
        "picking one, never the folder (shipped files are deleted, so the folder always\n" +
        "looks free). Fix: rename the new file to the next unused number.\n" +
        reused.join("\n"),
    ).toEqual([]);
  });
});
