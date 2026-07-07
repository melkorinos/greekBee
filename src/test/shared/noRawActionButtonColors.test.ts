// noRawActionButtonColors.test.ts
// Guards the success/danger ACTION-BUTTON tokens (ADR 0008 → --success / --danger).
//
// Approve/confirm and reject/destructive buttons must use the btnApprove /
// btnReject recipes (which reference the bg-success / bg-danger tokens), never a
// hand-rolled solid green/red fill. Those literals were duplicated across the
// Leksikastirio review cards + NominationCard (~10 copies) before consolidation;
// this test stops the pattern regrowing.
//
// Scope: ONLY the solid action-button fills bg-{green,red}-{500,600,700} and their
// variant prefixes (hover:/active:/…). Fixed-MEANING tints & scales are a different
// category and are intentionally NOT matched, so no allowlist is needed:
//   - difficulty tiers (green-400), the Stavrolekso solved cell (green-200),
//     status-banner tints (green-100/900, red-100/900), subtle confirmations
//     (green-50), and text-only accents (text-green-600) all use other shades.
// If a legitimate solid green/red *fill* ever appears, prefer a token; only then
// consider adding an allowlist here + a note in ADR 0008.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");
const SCAN_DIRS = ["src/components", "src/app", "src/games"];

// Solid green/red action-button fills, e.g. bg-green-600, hover:bg-red-600.
const ACTION_FILL = /\b(?:[a-z-]+:)?bg-(?:green|red)-(?:500|600|700)\b/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("success/danger tokens — no hand-rolled action-button green/red fills", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("scans a non-trivial number of components (guard is actually running)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("approve/reject buttons use the btnApprove/btnReject recipes, not literal fills", () => {
    const offenders: string[] = [];

    for (const rel of files) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      const hits = [...new Set(src.match(ACTION_FILL) ?? [])];
      if (hits.length > 0) offenders.push(`${rel}: ${hits.join(", ")}`);
    }

    expect(
      offenders,
      `Solid green/red action-button fills found — use the btnApprove / btnReject ` +
        `recipes (bg-success / bg-danger tokens) from src/styles/recipes.ts.\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });
});
