# words-2.json / words-3.json are dictionary-derived but the nomination re-sync never touches them

Status: needs-triage

## The one-sentence version

A 2–3-letter word accepted (or removed) through Leksikastirio updates `words-el.json` but leaves
`src/data/leksiarxeio/words-2.json` / `words-3.json` stale — and those files are what Vres Tin
Frasi uses to validate short guess words, so the game would keep rejecting an accepted short word
(or accepting a removed one) forever.

## The evidence (verified 2026-07-17)

- `words-2.json` / `words-3.json` are consumed by `src/app/vres-tin-frasi/page.tsx:9-10` and
  `src/games/vrestifrasi/lib/validateSubmission.ts:13-14`. Per ADR 0006's revision they derive
  from `words-el.json` (all length slices do).
- The ADR 0015 re-sync adapter (`scripts/lib/resync/leksiarxeio.ts:11-12`) states: *"Words outside
  LEKSIARXEIO.LENGTHS (len ≤ 3, len > 8) live in words-el.json and **nowhere else**; for them this
  adapter is correctly a no-op."* The premise is false for lengths 2–3 — they also live in the two
  files above.
- The drift guard (`src/test/shared/premadeDataConsistency.test.ts:135`) iterates
  `LEKSIARXEIO.LENGTHS` (4–8) only, so this drift is invisible to the test suite too — the exact
  failure mode ADR 0015 exists to prevent.
- ADR 0015's "Vres Tin Frasi is deliberately absent from the registry" reasoning covers its
  *phrases* (not dictionary-derived) — correct — but overlooked its *guess-validation pools*,
  which are.

## Severity

Low urgency: the nomination UI is Leksokipos-driven, so 2–3-letter nominations are rare — but the
POST route has no minimum-length guard, so nothing prevents one. No such nomination is known to
have been applied yet. When it happens the failure is silent and permanent.

## Shape of the fix

Extend the leksiarxeio adapter (or add a small sibling adapter) to slice lengths 2–3 into
`words-2.json` / `words-3.json` on the same add/remove rules, correct the adapter's header comment,
and extend `premadeDataConsistency.test.ts` to cover lengths 2 and 3 (the "exactly the dictionary
slice" check is cheap at those sizes). Update the `/apply-nominations` SKILL.md table and ADR 0015's
"deliberately absent" note to name the guess pools explicitly.

## References

- `scripts/lib/resync/leksiarxeio.ts` — the adapter with the false no-op premise
- `src/test/shared/premadeDataConsistency.test.ts` — drift guard, lengths 4–8 only
- `docs/adr/0006-word-list-2-3-letter-words.md` — where words-2/3 became dictionary-derived
- `docs/adr/0015-premade-data-resync-registry.md` — the registry this gap escapes
