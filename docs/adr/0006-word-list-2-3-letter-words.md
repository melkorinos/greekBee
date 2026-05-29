# ADR 0006 — Extend word list to include all 2 and 3-letter Greek words

**Status**: Accepted

## Context

The current word pools used for Vres Tin Frasi guess validation cover 4–8 letter words (Leksiarxeio pools). Common short Greek words — imperatives like "δες", "πες", particles like "ντε", "βρε", and many everyday 2–3 letter words — were absent from these pools.

Short words were previously handled by a hardcoded `FUNCTION_WORD_ALLOWLIST` (~60 entries in `functionWordAllowlist.ts`). This was ad-hoc and incomplete.

## Decision

Sourced 551 normalized 2–3 letter Greek words from the LibreOffice Hunspell `el_GR.dic` dictionary. Stored in `src/data/words-el-short.json` (separate from `words-el.json` which is 4+ letters only). Wired into:

- `src/app/vres-tin-frasi/page.tsx` — merged into `allWords` passed to the client
- `src/app/api/community-puzzles/vrestifrasi/route.ts` — `WORD_POOL` extended with lengths 2 and 3
- `src/games/vrestifrasi/hooks/vresTinFrasiReducer.ts` — allowlist check removed; `validWords` is now the single validation source

`functionWordAllowlist.ts` deleted. `words-el-extra.json` (12 hand-curated 4+ letter words) absorbed into `words-el.json` and deleted.

## Consequences

- Players can guess any real Greek phrase including short function words without hitting "word not found" errors
- Data root has two word-list files: `words-el.json` (4+ letters, 812k words) and `words-el-short.json` (2–3 letters, 551 words)
- `words-el-short.json` is on a disconnected pipeline from `words-el.raw.json` — it was derived from a separate Hunspell source. See issue `10-word-list-pipeline-gaps.md` for the full set of pipeline gaps that still need resolution.

## Revision — 2026-05-29: merged short words into unified word list

`words-el-short.json` (551 words, 2–3 letters) has been merged into `words-el.json` and the separate file deleted. `words-el.json` is now the single authoritative word list covering all lengths 2+.

**New contract for `words-el.json`:** 2+ letters, normalised (lowercase, accent-stripped, ς→σ), all real Greek words. Consumers that require a minimum length (Leksokipos: 4+; Leksiarxeio answer selection: exact length) own that filter themselves.

**Rebuild safety:** `normalize-el-dict.mjs` must use union-merge mode (not wipe-and-replace) when regenerating from `words-el.raw.json`. The script adds words from the new source to the existing `words-el.json` — it never removes words. Removals go through the Nomination flow only.

**Adding new short words in future:** run a one-off script against a new Hunspell `.dic` source, diff against the current `words-el.json`, review the delta, apply. No separate source file needed.

`leksiarxeio/words-{4..8}.json` now derives from `words-el.json` (filtered by exact length), not directly from `words-el.raw.json`.
