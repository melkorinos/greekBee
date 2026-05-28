# ADR 0006 — Extend word list to include all 2 and 3-letter Greek words

**Status**: Pending

## Context

The current word pools used for Vres Tin Frasi guess validation cover 4–8 letter words (Leksiarxeio pools). Common short Greek words — imperatives like "δες", "πες", particles like "ντε", "βρε", and many everyday 2–3 letter words — are absent from these pools.

Currently, short words that appear in common phrases are handled by the `FUNCTION_WORD_ALLOWLIST` (~50 entries hardcoded in `src/games/vrestifrasi/lib/functionWordAllowlist.ts`). This list was built ad-hoc and is incomplete.

## Decision

Extend the platform word list to include all valid 2 and 3-letter Greek words. This should be done as a separate, dedicated task:

1. Source a comprehensive list of 2-letter and 3-letter Greek words (normalized, no accents, ς→σ)
2. Add them to `words-el.json` (or a separate `words-el-short.json` loaded alongside)
3. Pass them into the Vres Tin Frasi page's `validWords` set (already merges all pools)
4. The `FUNCTION_WORD_ALLOWLIST` can then be reduced or removed entirely, since the full pool will cover those words

## Consequences

- Players can guess any real Greek phrase, including those with common short words, without hitting "word not found" errors
- The allowlist becomes a backstop for edge cases only, not a primary mechanism
- The word list will grow in size (~500–2000 extra entries), which is acceptable at build time (JSON import, no runtime cost)
