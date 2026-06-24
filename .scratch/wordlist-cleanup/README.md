# Wordlist proper-noun cleanup — deliverable

Proposes **16,933 proper-noun removals** from `src/data/words-el.json`
(812,168 → 795,235) so countries, cities, and personal names stop scoring in
Leksokipos. **Not yet applied. Nothing committed touches the data files.**

Full method, decisions, and rationale: **`.claude/wordlist-proper-noun-cleanup-handoff.md`**

## Files here

| File | Role |
|------|------|
| `decisions.json` | Source of truth — `{word: "remove"｜"keep"}` (16,933 remove / 658 keep) |
| `removed-words.txt` | Flat, sorted audit record of every removed word |
| `apply-cleanup.mjs` | Local one-pass apply: words-el + leksiarxeio words-{4..8} + puzzle re-sync (~2s) |
| `fetch-additions.mjs` | Supabase READ → `additions.json` (admin-approved additions) |
| `mark-additions-reviewed.mjs` | Supabase WRITE — mark applied additions `reviewed_at` (run last) |

## Apply (short form — see handoff for the full runbook)

```bash
node fetch-additions.mjs          # with --env-file flags; on a machine with Supabase creds
node apply-cleanup.mjs            # dry-run preview
node apply-cleanup.mjs --in-place # write data files
# verify (test/lint/build), then:
node mark-additions-reviewed.mjs --confirm
```

`apply-cleanup.mjs` reuses `scripts/lib/resync-puzzles.mjs` and is idempotent.
Removals are entirely local; only the admin additions involve Supabase.
