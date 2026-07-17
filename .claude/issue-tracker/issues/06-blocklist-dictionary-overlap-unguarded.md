# 16 words are on the nomination blocklist AND in words-el.json, with no guard test

Status: needs-triage

## The one-sentence version

`nominations-blocklist.json` and `words-el.json` are supposed to be disjoint — the blocklist *is*
the set of words curated OUT of the dictionary — but 16 words are currently in both, and no test
asserts the invariant, so the drift is silent.

## The evidence (verified 2026-07-17)

Counted directly from the two committed data files:

- blocklist entries: 16,947
- dictionary words: 795,344
- **overlap: 16**

The overlapping words:

```
αλωναρησ, απριλιοσ, ατλασ, αυγουστοσ, δεκεμβριοσ, ιανουαριοσ, ιουλιοσ,
ιουνιοσ, μαιοσ, μαρτιοσ, νοεμβριοσ, οκτωβριοσ, ορκα, σεπτεμβριοσ,
τρυγητησ, φεβρουαριοσ
```

That is all 12 month names, two archaic month names (αλωναρησ = July, τρυγητησ = September), plus
ατλασ and ορκα. The month-name half of this is the known conflict deferred on 2026-07-16.

`src/lib/nominationBlocklist.ts:10-13` states the design premise the overlap violates: dual-use
words that are also common nouns were *intentionally kept* in the dictionary and are *not* in the
list. These 16 are in the list.

## Why it matters

The two files answer different questions and currently disagree:

- Leksokipos/Leksiarxeio accept ΙΑΝΟΥΑΡΙΟΣ as a valid word (it's in the dictionary).
- Leksikastirio refuses a proposal to add it, and `lookup` returns `blocked: true`.

So a player can *play* a word the nomination system calls unacceptable. Worse, a `direction=remove`
report for a month name is allowed through (the block is add-only, correctly) — meaning the intended
resolution is reachable through the product, but nobody has decided which way it should go.

## The test gap

- `nominationBlocklist.test.ts` only exercises `isBlockedWord` against hand-picked words. Its
  "does NOT block common Greek words that double as names" case would pass even if the overlap
  were 16,000 rather than 16.
- `deploymentReadiness.test.ts:93-96` only asserts `nominations-blocklist.json` *exists*.
- Nothing computes the intersection.

## Shape of the fix

Two decisions, in order — the ticket is not just "add the test":

1. **Decide the invariant.** Either the 16 words leave the dictionary (blocklist wins) or they leave
   the blocklist (dictionary wins). Months are the substantive call; ατλασ/ορκα are common nouns
   (atlas, orca) that look like list false-positives and probably just leave the blocklist.
2. **Then add the guard test** asserting `blocklist ∩ words-el.json = ∅`, so the next edit to either
   file can't reintroduce drift.

**The guard test goes red today with 16 entries.** Land it only after step 1, or land it with the
current 16 as an explicit, enumerated allowlist that shrinks to zero — do not weaken the assertion.

## References

- `src/lib/nominationBlocklist.ts:10-13` — the stated premise the overlap violates
- `src/data/nominations-blocklist.json`, `src/data/words-el.json` — the two files
- `src/test/shared/nominationBlocklist.test.ts` — unit tests that can't see the drift
