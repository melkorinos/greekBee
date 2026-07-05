// noRawPaletteClasses.test.ts
// Guards ADR 0008: shipped components reference SEMANTIC TOKENS (bg-surface,
// text-muted, border-border, …), never literal NEUTRAL palette classes
// (stone/zinc/gray/slate/neutral). Literal neutral classes don't flip in dark
// mode, so they are the exact class of dark-mode bug this test prevents.
//
// Accent colours (amber/green/red/purple/sky/yellow) are intentionally NOT
// checked — they encode fixed meaning (difficulty tiers, status banners, brand)
// and are documented exceptions in ADR 0008.
//
// How it works: scan every shipped component .tsx under src/{components,app,games}
// for a Tailwind utility that pairs a colour-taking prefix with a neutral scale.
// Files that legitimately need raw neutrals are ALLOWLISTED below; extending the
// allowlist requires a matching entry in ADR 0008 § "Documented exceptions".

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");
const SCAN_DIRS = ["src/components", "src/app", "src/games"];

// Files that deliberately use raw neutral classes (see ADR 0008 exceptions).
// Keep in sync with that ADR — adding here without documenting there is drift.
const ALLOWLIST = new Set<string>([
  "src/games/stavrolekso/StavroleksoGrid.tsx", // functional crossword cells, dark-handled
  "src/components/shared/Shell.tsx",           // intentionally always-dark nav drawer
  "src/components/shared/FeedbackBanner.tsx",  // explicit theme-prop pattern; no success/error surface tokens
  "src/components/leksokipos/FlowerGridPlayground.tsx", // dev-only design tool, not shipped UI
]);

// Utility-prefix + neutral-scale, e.g. bg-stone-100, hover:text-zinc-400,
// focus-visible:ring-gray-300. The optional `variant:` prefix covers hover/
// active/focus/group-hover/etc.
const RAW_NEUTRAL =
  /\b(?:[a-z-]+:)?(?:bg|text|border|ring|divide|from|via|to|placeholder|outline|decoration|accent|caret|fill|stroke|shadow)-(?:stone|zinc|gray|slate|neutral)-\d{2,3}\b/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("ADR 0008 — no literal neutral palette classes in shipped components", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("scans a non-trivial number of components (guard is actually running)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every component uses semantic tokens, not raw stone/zinc/gray classes", () => {
    const offenders: string[] = [];

    for (const rel of files) {
      if (ALLOWLIST.has(rel)) continue;
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      const hits = [...new Set(src.match(RAW_NEUTRAL) ?? [])];
      if (hits.length > 0) offenders.push(`${rel}: ${hits.join(", ")}`);
    }

    expect(
      offenders,
      `Literal neutral palette classes found — use semantic tokens (ADR 0008) or, ` +
        `if genuinely intentional, add the file to ALLOWLIST here + document it in ADR 0008.\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("allowlisted files still exist and still contain a raw neutral (no stale entries)", () => {
    for (const rel of ALLOWLIST) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      expect(RAW_NEUTRAL.test(src), `${rel} is allowlisted but no longer needs it — remove it`).toBe(true);
      RAW_NEUTRAL.lastIndex = 0; // reset the /g regex between iterations
    }
  });
});
