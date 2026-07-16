# ADR 0015 — Premade dictionary-derived data is re-synced through an adapter registry

**Status**: Accepted

## Context

Several games ship **premade data derived from `words-el.json`**, precomputed offline so the runtime never loads the ~795k-word dictionary (Fluid cold-start budget):

| Game | Derived data | Derived how |
|---|---|---|
| Leksokipos | `puzzles-el.json` → `validWords` | every dictionary word the puzzle's 7 letters accept |
| Leksiarxeio | `words-{N}.json` | the dictionary sliced by length |
| Leksoplegma | `puzzles-el.json` → `bonusWords` | every dictionary word traceable on the board's edge web |
| Leksodromia | `anagramAlternates.json` | anagrams of each curated answer, drawn from `words-{N}.json` |

Nothing re-derives any of it at runtime. So when an accepted Leksikastirio Nomination edits the dictionary, every one of these files is **silently stale**: a removed word keeps scoring forever, and an added word never scores.

`apply-nominations` only ever re-synced **Leksokipos** (and, inline, Leksiarxeio). Leksoplegma and Leksodromia were simply missed — on the backlog current at the time of writing, 10 Leksoplegma boards were affected. The bug is invisible: no test, lint, or build failure, only wrong scores in production.

The root friction was mechanical. `apply-nominations.mjs` was the only data script run via plain `node` + `.mjs`, so it **could not import TypeScript** and therefore **re-mirrored real game logic**: a duplicated `normalise()`, and a `puzzleAcceptsWord()` whose own header admitted it was a "mirror of computeValidWords.ts" — one that hardcoded `>= 4` instead of `LEKSOKIPOS.MIN_WORD_LENGTH`. Mirrors drift, and a mirror of a scoring rule drifts into wrong scores.

## Decision

**1. The data scripts are TypeScript, run via `tsx`.** `apply-nominations` and `apply-proposed-words` are now `.ts`, matching every sibling data script. This is the enabling move: they can import the real game predicates, so **every mirror is deleted**.

**2. Premade re-sync goes through a registry of per-game adapters** (`scripts/lib/resync/`) over one contract:

```ts
interface ResyncAdapter<Content> {
  id: string;
  load(): Content;
  resync(content: Content, edits: DictionaryEdits): { content: Content; report: ResyncReport };
  files(content: Content): Array<{ path: string; contents: string }>;
}
```

`resync` is **pure** (content in, content out) so it is testable through its interface and re-runnable over committed data. `files` is pure too — it returns the exact bytes persisting would write, without writing them. **`load` is the adapter's only I/O**; the registry does all writing, since the rule is the same for every game (never on a dry run, never when nothing changed).

That split exists for a specific reason: the write path is the one part of re-sync that a dry run can never exercise, so a byte-format mistake would surface only by silently reformatting a data file on the first real run. Because `files` is pure, `premadeDataConsistency.test.ts` asserts `files(load())` reproduces every committed file byte for byte, with no I/O at all.

The scripts become thin orchestrators that own `words-el.json` — the source — and walk the registry for everything derived from it. Adding a game means adding an adapter, not editing an orchestrator. Both scripts consume the same registry, so a word injected by either keeps every game correct.

Adapters **reuse the real predicates** rather than mirroring them — `computeValidWords` for Leksokipos, `canTrace`/`edgesOf` for Leksoplegma, `normalizeLetters` platform-wide, `LEKSIARXEIO.LENGTHS`/`LEKSODROMIA.LENGTHS` from config. The Leksokipos adapter calls `computeValidWords(center, outer, [word])` per word rather than extracting a shared per-word predicate: it rebuilds a 7-element Set per check, which is irrelevant in a script, and it keeps a hot production path (with an explicit O(n) performance contract) untouched.

**3. Curated data is never auto-edited — it warns.** Some data is authored by a human, not derived: Leksoplegma `paths` (baked into grid geometry), Leksiarxeio `answers-{N}.json`, Leksodromia's answer pools. An edit that invalidates one of these produces a `ResyncReport.warning` naming the affected id and leaves the data alone. Silently rewriting curated geometry from a word-list script would be far worse than a loud stop.

**4. Drift is guarded by a test.** `src/test/shared/premadeDataConsistency.test.ts` checks committed data against the committed dictionary. It is tiered by cost: exhaustive for the direction that catches the real bug (no derived word may be absent from the dictionary), exact for the cheap-to-re-derive games (Leksiarxeio, Leksodromia), and a deterministic sample for full re-derivation of Leksokipos/Leksoplegma, where re-deriving everything (~1s per puzzle × hundreds) is far too slow for CI.

**Vres Tin Frasi is deliberately absent** from the registry: its phrases are not dictionary-derived, so no Nomination can make them stale. The omission is recorded in `registry.ts` so it reads as a decision.

## Consequences

- One accepted nomination now keeps **every** dictionary-derived game correct. Two real staleness bugs (Leksoplegma `bonusWords`, Leksodromia `anagramAlternates`) are closed.
- The scoring rules have a single source of truth. The script can no longer disagree with the game about what a word is worth.
- Silent drift becomes a red test instead of a production bug.
- Scores already written are **not** recomputed — `game_scores` rows are append-forever historical facts (see ADR 0013). Re-sync only fixes what future plays score.
- The `.mjs` → `.ts` conversion carries one constraint worth knowing: `package.json` has no `"type": "module"`, so `tsx` compiles these scripts as **CJS**. They use the plain `__dirname` global and must avoid top-level `await`. This matches every sibling data script. It is also invisible to lint, build, and tests — only running the script catches a violation.
