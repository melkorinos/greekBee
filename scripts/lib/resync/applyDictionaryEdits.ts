// applyDictionaryEdits.ts — the one orchestrator for a dictionary edit.
//
// ADR 0015 gave each game's derived data an adapter seam; this module owns
// everything around it: words-el.json I/O, the add/remove dedup routing, the
// registry walk, and the operator-facing report. Scripts keep only how they
// source their edits (apply-nominations: the DB; apply-proposed-words: argv).
//
// The serialisation of words-el.json is a hidden invariant — it must stay byte
// identical to what every other tool writes — so it lives here once, not copied
// into each consumer.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { normalizeLetters } from "@/lib/normalize";
import {
  DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP,
  isBlockedWord,
} from "@/lib/nominationBlocklist";

import { RESYNC_REGISTRY, type RegisteredResync } from "./registry";

/** One requested edit, pre-normalisation — exactly what a consumer sources. */
export interface DictionaryEditRequest {
  word: string;
  direction: "add" | "remove";
}

export interface ApplyDictionaryEditsOptions {
  dryRun: boolean;
  /** Overridable so tests can drive the orchestrator over fake adapters. */
  registry?: RegisteredResync[];
  /** Overridable so tests can point at a temp dictionary. */
  wordsElPath?: string;
  log?: (line: string) => void;
}

export interface ApplyDictionaryEditsResult {
  /** Normalised words that actually landed — skips excluded. */
  added: string[];
  removed: string[];
  /** Requested but no-ops: adds already present, removes not in the list. */
  skipped: string[];
  /** Everything no adapter could auto-fix, already printed. */
  warnings: string[];
  wordListChanged: boolean;
}

const defaultWordsElPath = join(__dirname, "../../../src/data/words-el.json");

const DEFERRED_OVERLAP = new Set(DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP);

/**
 * Re-check the blocklist at apply time and stop the run on a hit.
 *
 * The blocklist is only enforced at propose-time (the two edge nomination
 * routes), and it is a version-controlled JSON file editable without a deploy —
 * so a word can be approved while clean, blocklisted afterwards, and applied
 * anyway. That window ends here: the blocklist is authoritative at the moment
 * of the write.
 *
 * Throwing, not skipping, is the point. A silent skip would leave the row
 * `accepted` forever and re-trigger on every subsequent run; a human has to say
 * whether the blocklist or the approval is wrong. Applying is the last
 * irreversible step before every dictionary-derived file is re-synced (ADR
 * 0015), so this runs before ANY write — including on a dry run, which is the
 * run an admin actually reads.
 *
 * The deferred month names live in both the blocklist and words-el.json on
 * purpose, so they are exempt or every run would stop on one.
 */
function assertNotBlocked(words: string[]): void {
  const blocked = words.filter(
    (word) => isBlockedWord(word) && !DEFERRED_OVERLAP.has(word),
  );
  if (blocked.length === 0) return;

  throw new Error(
    `Blocklisted word(s) in an accepted add: ${blocked.join(", ")}\n` +
      `These are on the nomination blocklist but were approved for adding to the ` +
      `dictionary — the blocklist changed after approval, or the approval was a ` +
      `mistake. Resolve it by hand: either reject the nomination row, or remove ` +
      `the word from src/data/nominations-blocklist.json. Nothing was written.`,
  );
}

export function applyDictionaryEdits(
  requests: DictionaryEditRequest[],
  {
    dryRun,
    registry = RESYNC_REGISTRY,
    wordsElPath = defaultWordsElPath,
    log = console.log,
  }: ApplyDictionaryEditsOptions,
): ApplyDictionaryEditsResult {
  // words-el.json is the dictionary itself — the source every adapter derives
  // from — so the orchestrator owns it directly. Everything downstream of it is
  // an adapter in the re-sync registry.
  // Gate first, before the dictionary is even read: a blocklisted add must stop
  // the run whole, never half-apply the clean words alongside it.
  assertNotBlocked(
    requests
      .filter((r) => r.direction === "add")
      .map((r) => normalizeLetters(r.word)),
  );

  let wordsEl = JSON.parse(readFileSync(wordsElPath, "utf8")) as string[];
  const wordsElSet = new Set(wordsEl);

  const added: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];

  for (const request of requests) {
    const word = normalizeLetters(request.word);
    const len = [...word].length;

    if (request.direction === "add") {
      if (wordsElSet.has(word)) {
        log(`  SKIP  (already exists) → ${word}`);
        skipped.push(word);
        continue;
      }
      log(`  ADD   (len ${len}) → ${word}`);
      added.push(word);
      wordsElSet.add(word);
      wordsEl.push(word);
    } else {
      if (!wordsElSet.has(word)) {
        log(`  SKIP  (not in list)    → ${word}`);
        skipped.push(word);
        continue;
      }
      log(`  REMOVE (len ${len}) → ${word}`);
      removed.push(word);
      wordsElSet.delete(word);
      wordsEl = wordsEl.filter((w) => w !== word);
    }
  }

  const wordListChanged = added.length > 0 || removed.length > 0;
  const warnings: string[] = [];

  if (!wordListChanged) {
    return { added, removed, skipped, warnings, wordListChanged };
  }

  if (!dryRun) {
    writeFileSync(wordsElPath, JSON.stringify(wordsEl.sort()), "utf8");
    log(`\nUpdated src/data/words-el.json`);
  }

  // Each registered adapter patches its own derived data so removed words stop
  // scoring and added words start scoring. Runs in dry-run too, as a preview
  // (the registry gates the write, not this loop).
  for (const game of registry) {
    const report = game.apply({ added, removed }, { dryRun });
    warnings.push(...report.warnings);

    if (report.changed.length === 0) {
      log(`\n${game.id}: no premade data affected — unchanged.`);
      continue;
    }

    log(`\n${game.id}: re-sync${dryRun ? " [DRY RUN]" : ""} — ${report.changed.length} item(s) affected`);
    for (const c of report.changed) {
      const parts: string[] = [];
      if (c.added.length) parts.push(`+${c.added.join(", +")}`);
      if (c.removed.length) parts.push(`-${c.removed.join(", -")}`);
      log(`  ${c.id ?? "(no id)"}: ${parts.join("  ")}`);
    }
    if (!dryRun) log(`Updated ${game.id} premade data.`);
  }

  // Things no adapter could auto-fix — surfaced last so they are the final
  // thing the operator reads before touching the git diff.
  if (warnings.length > 0) {
    log(`\n⚠ Manual action required:`);
    for (const w of warnings) log(`  - ${w}`);
  }

  return { added, removed, skipped, warnings, wordListChanged };
}
