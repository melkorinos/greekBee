#!/usr/bin/env node
// validate-connections.mjs — validates puzzles-connections.json.
// Checks: exactly 4 groups, each with exactly 4 words, no duplicate words,
// valid difficulty values (1–4), all dates unique, words non-empty strings.

import { dirname, resolve } from "path";

import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, "../src/data/connections/puzzles-connections.json");

const puzzles = JSON.parse(readFileSync(dataPath, "utf8"));

let errors = 0;

function fail(msg) {
  console.error(`❌  ${msg}`);
  errors++;
}

// Collect all dates to check for duplicates
const dates = puzzles.map((p) => p.date);
const duplicateDates = dates.filter((d, i) => dates.indexOf(d) !== i);
if (duplicateDates.length > 0) {
  fail(`Duplicate puzzle dates: ${duplicateDates.join(", ")}`);
}

for (const puzzle of puzzles) {
  const { date, groups } = puzzle;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(`[${date}] date is not in YYYY-MM-DD format`);
  }

  if (!Array.isArray(groups) || groups.length !== 4) {
    fail(`[${date}] must have exactly 4 groups (found ${groups?.length ?? 0})`);
    continue;
  }

  const allWords = [];

  for (const group of groups) {
    const { category, words, difficulty } = group;

    if (!category || typeof category !== "string") {
      fail(`[${date}] group is missing a valid category string`);
    }

    if (![1, 2, 3, 4].includes(difficulty)) {
      fail(`[${date}] "${category}" — difficulty must be 1, 2, 3, or 4 (got ${difficulty})`);
    }

    if (!Array.isArray(words) || words.length !== 4) {
      fail(`[${date}] "${category}" — must have exactly 4 words (found ${words?.length ?? 0})`);
      continue;
    }

    for (const word of words) {
      if (typeof word !== "string" || word.trim() === "") {
        fail(`[${date}] "${category}" — contains an empty or non-string word`);
      }
    }

    allWords.push(...words);
  }

  // Check for duplicate words within the puzzle
  const seen = new Set();
  for (const word of allWords) {
    if (seen.has(word)) {
      fail(`[${date}] duplicate word across groups: "${word}"`);
    }
    seen.add(word);
  }

  if (allWords.length === 16) {
    console.log(`✅  ${date} — valid (16 words, 4 groups)`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} validation error(s) found.`);
  process.exit(1);
} else {
  console.log(`\nAll ${puzzles.length} puzzle(s) valid.`);
}
