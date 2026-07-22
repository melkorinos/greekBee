// noLiteralColumnWidth.test.ts
// Guards the platform column-width token (handoff 01): shipped components use the
// --container-game token via `max-w-game`, never the literal `max-w-sm` it
// replaced. The game column width is a single knob in globals.css; a stray
// `max-w-sm` silently forks it, so the redesign can no longer resize every page
// from one place.
//
// Same walker pattern as noRawPaletteClasses.test.ts. No allowlist: every game
// surface shares the one column width. If one genuinely needs a different width,
// use a different, intentional utility (max-w-md/max-w-lg/max-w-6xl) — not
// max-w-sm — so the fork is visible rather than a look-alike of the token.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");
const SCAN_DIRS = ["src/components", "src/app", "src/games"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("handoff 01 — no literal column width (max-w-sm) in shipped components", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("scans a non-trivial number of components (guard is actually running)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every component uses max-w-game, not the literal max-w-sm", () => {
    const offenders: string[] = [];

    for (const rel of files) {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      if (/\bmax-w-sm\b/.test(src)) offenders.push(rel);
    }

    expect(
      offenders,
      `Literal max-w-sm found — use the column-width token max-w-game (--container-game).\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });
});
