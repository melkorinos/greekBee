# ADR 0015 — Premade dictionary-derived data is re-synced through an adapter registry

**Status**: Accepted

## Context

Several games ship **premade data derived from `words-el.json`**, precomputed offline so the runtime never loads the ~795k-word dictionary (Fluid cold-start budget):

| Game | Derived data | Derived how |
|---|---|---|
| Leksokipos | `puzzles-el.json` → `validWords` | every dictionary word the puzzle's 7 letters accept |
| Leksiarxeio | `words-{4..8}.json` | the dictionary sliced by length |
| Vres Tin Frasi | `words-{2,3}.json` | the dictionary sliced by length — its short-word guess pool |
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

**2b. There is exactly one orchestrator, not one per script.** `applyDictionaryEdits(requests, { dryRun })` owns `words-el.json` — the source — plus the add/remove dedup routing, the registry walk, and the operator report. Each script keeps only **how it sources its edits**: `apply-nominations` reads the DB and marks rows reviewed; `apply-proposed-words` parses argv and `--file`.

This was originally one orchestrator copy-pasted into each script, which meant the serialisation of `words-el.json` was a hidden invariant held in sync by hand — two places that had to agree byte for byte with each other and with every other tool, and nothing but care enforcing it. A third consumer (an admin route, say) would have been a third copy. It is now one call, and the serialisation contract is pinned by a test rather than a comment saying "match apply-nominations exactly". The registry and the dictionary path are injectable, so the orchestrator is testable over a temp dictionary and fake adapters — feed it edits, assert the files.

Adding a game means adding an adapter, not editing an orchestrator. Both scripts consume the same registry, so a word injected by either keeps every game correct.

Adapters **reuse the real predicates** rather than mirroring them — `computeValidWords` for Leksokipos, `canTrace`/`edgesOf` for Leksoplegma, `normalizeLetters` platform-wide, `LEKSIARXEIO.LENGTHS`/`LEKSODROMIA.LENGTHS` from config. The Leksokipos adapter calls `computeValidWords(center, outer, [word])` per word rather than extracting a shared per-word predicate: it rebuilds a 7-element Set per check, which is irrelevant in a script, and it keeps a hot production path (with an explicit O(n) performance contract) untouched.

**3. Curated data is never auto-edited — it warns.** Some data is authored by a human, not derived: Leksoplegma `paths` (baked into grid geometry), Leksiarxeio `answers-{N}.json`, Leksodromia's answer pools. An edit that invalidates one of these produces a `ResyncReport.warning` naming the affected id and leaves the data alone. Silently rewriting curated geometry from a word-list script would be far worse than a loud stop.

**4. Drift is guarded by a test, in both directions, exhaustively.** `src/test/shared/premadeDataConsistency.test.ts` checks committed data against the committed dictionary. Derived data can be wrong two ways — a removed word that keeps scoring, and an added word that never scores — and both are the bug this ADR exists for, so every check covers every game, every puzzle, every word.

This was first written with the missed-addition direction *sampled* (3 of ~1000 Leksokipos puzzles, 2 of 200 Leksoplegma boards), on the reasoning that re-deriving everything (~1s per puzzle × hundreds) was too slow for CI. That was a mistake, and measurement killed it: a nomination typically touches a handful of puzzles out of ~1000, so a sample of three has almost no chance of intersecting the damage. On the first real batch (18 adds), 16 of the 18 words touched **zero** sampled puzzles, and deleting a genuine word from an unsampled puzzle left the suite green. The sampled check was close to vacuous against precisely the failure mode that motivated this work.

The cost that forced the sampling was an artifact. Re-deriving a Leksokipos puzzle by asking the real predicate about all 795k words is ~1s; but every word `computeValidWords` can accept is spelled only from the puzzle's letters, so grouping the dictionary by each word's letter-set bitmask turns "everything this puzzle could possibly accept" into ≤ 2^7 = 128 map lookups. All ~1000 puzzles now re-derive in **~350 ms**. The index is a *prefilter*, not a second implementation of the rules — the real predicate still makes every accept/reject decision, and a too-narrow prefilter would drop a word and turn the test **red**, never green. Leksoplegma is deliberately left un-indexed (`enumerateBonusWords` compares raw strings, so indexing it would change what the real generator sees rather than narrow it) and simply pays ~40 s for all 200 boards.

**Vres Tin Frasi is in the registry for its guess pools, not its phrases.** The two must be named separately, because conflating them is what caused a real bug.

Its **phrases** (`phrases-el.json`) are authored content — not dictionary-derived — so no Nomination can make them stale, and no adapter covers them. That part was always correct.

Its **guess-validation pools** (`words-{2,3}.json`) are the opposite: pure dictionary slices, exactly like Leksiarxeio's 4–8 lists, ever since ADR 0006's 2026-05-29 revision made `words-el.json` the single source for every length. They were originally overlooked because "Vres Tin Frasi is deliberately absent" was reasoning about the phrases and quietly generalised to the whole game, and because the files sit in `src/data/leksiarxeio/` — so they read as Leksiarxeio's, while Leksiarxeio is never played below 4 letters and never touches them. The `leksiarxeio` adapter's own header asserted that words of length ≤ 3 "live in words-el.json and nowhere else", which was simply false.

The slicing rule is identical for both games, so it lives once in `lengthSlicedWords.ts` and each game binds it to the lengths it owns: `LEKSIARXEIO.LENGTHS` (4–8) and `VRESTIFRASI.SHORT_WORD_LENGTHS` (2–3). The two sets must stay **disjoint** — both write into the same directory, so an overlap would mean two adapters owning one file and the second clobbering the first. A guard test pins it.

**Known drift, deferred (2026-07-17).** By the time the gap was found, the pools had already drifted: 118 words (7 at length 2, 111 at length 3) are listed in the pools but absent from `words-el.json`. All 118 are on the proper-noun blocklist — acronyms and names (ΗΠΑ, ΚΚΕ, ΟΤΕ, ΦΠΑ…) curated out of the dictionary while the pools never heard about it. The missed-addition direction is clean; only stale removals accumulated. They are **pinned in `premadeDataConsistency.test.ts` as a shrink-only ratchet rather than purged**, because purging is a gameplay decision: dropping `ρει` makes the committed phrase "Τα πάντα ρει" unwinnable, since the reducer refuses to submit a guess word absent from the pool. A *new* stale word still turns the guard red, so the adapter's work is guarded from here on.

## Consequences

- One accepted nomination now keeps **every** dictionary-derived game correct. Two real staleness bugs (Leksoplegma `bonusWords`, Leksodromia `anagramAlternates`) are closed.
- The scoring rules have a single source of truth. The script can no longer disagree with the game about what a word is worth.
- Silent drift becomes a red test instead of a production bug.
- Scores already written are **not** recomputed — `game_scores` rows are append-forever historical facts (see ADR 0013). Re-sync only fixes what future plays score.
- The `.mjs` → `.ts` conversion carries one constraint worth knowing: `package.json` has no `"type": "module"`, so `tsx` compiles these scripts as **CJS**. They use the plain `__dirname` global and must avoid top-level `await`. This matches every sibling data script. It is also invisible to lint, build, and tests — only running the script catches a violation.
