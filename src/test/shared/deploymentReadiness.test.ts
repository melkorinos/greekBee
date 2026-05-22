// deploymentReadiness.test.ts
// Catches the class of bug where a file is statically imported by a data loader
// but is listed in .gitignore — meaning it exists locally but Vercel won't have it.
//
// How it works:
//   1. Parse .gitignore into minimatch patterns (simple line-by-line, no fancy glob lib needed)
//   2. Assert that every data file that the app statically imports at build time
//      is NOT matched by any .gitignore pattern
//   3. Assert that the files physically exist on disk (catches "file deleted but import left")

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";

import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");

// ── Parse .gitignore ──────────────────────────────────────────────────────────

function loadGitignorePatterns(): string[] {
  const raw = readFileSync(resolve(ROOT, ".gitignore"), "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/**
 * Minimal gitignore matcher — handles:
 *   - Exact paths:           src/data/words-en.json
 *   - Glob suffix:           src/data/wordle/words-*.json
 *   - Leading slash (root):  /node_modules
 */
function isIgnored(filePath: string, patterns: string[]): boolean {
  // Normalise to forward slashes, strip leading ./
  const norm = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

  for (const pattern of patterns) {
    const p = pattern.replace(/^\//, ""); // strip leading /

    if (p.includes("*")) {
      // Convert glob to regex: escape dots, replace * with [^/]*
      const regexStr = p
        .replace(/\./g, "\\.")
        .replace(/\*/g, "[^/]*");
      const re = new RegExp(`(^|/)${regexStr}($|/)`);
      if (re.test(norm)) return true;
    } else {
      // Exact match or path-prefix match
      if (norm === p || norm.startsWith(p + "/") || norm.endsWith("/" + p)) {
        return true;
      }
    }
  }
  return false;
}

// ── Files the app statically imports at build time ────────────────────────────
// This list must be kept in sync with actual `import ... from` statements in
// src/data/**/index.ts. Add an entry here whenever you add a new static import.

const STATICALLY_IMPORTED_DATA_FILES = [
  // Wordle — one list per length (answers + valid guesses, same file)
  "src/data/wordle/words-4.json",
  "src/data/wordle/words-5.json",
  "src/data/wordle/words-6.json",
  "src/data/wordle/words-7.json",
  "src/data/wordle/words-8.json",
  // Connections
  "src/data/connections/puzzles-connections.json",
  // Spelling Bee — pre-built puzzles + full word list (used by buildCustomPuzzle)
  "src/data/spelling-bee/puzzles-el.json",
  "src/data/words-el.json",
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Deployment readiness — statically imported data files", () => {
  const patterns = loadGitignorePatterns();

  for (const file of STATICALLY_IMPORTED_DATA_FILES) {
    it(`${file} — exists on disk`, () => {
      expect(
        existsSync(resolve(ROOT, file)),
        `File not found: ${file}\nVercel will fail to build without it.`,
      ).toBe(true);
    });

    it(`${file} — not gitignored (Vercel can see it)`, () => {
      expect(
        isIgnored(file, patterns),
        `${file} is matched by .gitignore.\nVercel clones the repo and will NOT have this file at build time.\nEither commit it (remove from .gitignore) or change the import to be dynamic.`,
      ).toBe(false);
    });
  }
});
