# Handoff — Greek wordlist proper-noun cleanup

**Status:** Removal list finalized and confirmed. **Not yet applied** to the data
files. Nothing committed. A human runs the apply runbook below.

## What this is

`src/data/words-el.json` (812,168 words, built from a Hunspell `el_GR` dictionary)
contained proper nouns — countries, cities, personal names, surnames — that count
as valid words in Leksokipos. This cleanup proposes **16,933 removals** (down to
795,235) so proper nouns stop scoring. **658 collision words were deliberately kept.**

All artifacts live in `.scratch/wordlist-cleanup/`. `decisions.json` is the source
of truth (`{word: "remove"|"keep"}`); `removed-words.txt` is the flat audit record.

## How the list was derived (method & key decisions)

- **Capitalisation is the signal.** The source Hunspell `el_GR.dic` capitalises
  proper nouns (Δράμα the city) vs common words (δράμα the noun). words-el.json
  lost that when it was lowercased; we recovered it from a fresh `el_GR.dic`
  (ISO-8859-7). A word that is **only** a capitalised lemma → remove; a word that
  is **also** a lowercase common lemma → kept. Since words-el.json was generated
  from this same dictionary, a real common word almost always appears as a
  lemma, so the risk of removing a valid word is near-zero and non-systematic.
- **Case forms, not prefixes.** We remove a proper noun's own grammatical case
  forms (Τουρκία→Τουρκίας) but never derived words — τουρκικός ("Turkish"),
  ελληνικός, γαλλικός all stay. (Confirmed against the reviewer's rule: remove
  Γαλλία/Γαλλίας/Τουρκίας, keep τουρκικό/γαλλικό.)
- **Names = the Hunspell proper-noun lemma set** (~19,745 lemmas: first names,
  surnames, mythological, foreign). Validated with a frequency list — the
  high-frequency removals are foreign first names (Τζακ/Τζον/Τομ), confirming
  they're names.
- **Systematic rescues** (common words Greek merely capitalises, pulled back from
  removal): 12 **months**, Σάββατο/Κυριακή, Χριστούγεννα/Πάσχα, and **demonyms**
  (Έλληνας, Άγγλος, Γάλλος, Τούρκος, Ρώσος… all gender/number forms) — the
  reviewer chose to keep demonyms as vocabulary.
- **Human-reviewed collisions** (countries+places that are also common words):
  kept σοφια (wisdom) etc.; removed σπαρτη, αττικη, ολυμπια, μανη and the famous
  countries (γερμανια, πολωνια, ρουμανια, συρια, τουρκια, μιλανο, αργεντινη).
- **Risk posture:** small, non-repetitive risk accepted. The systematic risks
  (months, demonyms, name-words) were handled explicitly; residual risk is a rare
  common word not in the dictionary as a lemma.

## Apply runbook (local-first)

Removals are 100% local. Only admin-approved **additions** live in Supabase, so we
fetch those once and apply everything locally in one pass. Run the Supabase steps
where `.env` has `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

```bash
cd .scratch/wordlist-cleanup

# 1. fetch admin-approved additions (Supabase READ-only) → additions.json
node --env-file-if-exists=../../.env --env-file-if-exists=../../.env.local fetch-additions.mjs

# 2. preview, then apply locally (~2s; words-el + leksiarxeio words-{4..8} + puzzle re-sync)
node apply-cleanup.mjs
node apply-cleanup.mjs --in-place

# 3. verify
( cd ../.. && npm run test -- --run && npx eslint . && npm run build )

# 4. ONLY after verify passes — mark additions reviewed (the lone Supabase WRITE)
node --env-file-if-exists=../../.env --env-file-if-exists=../../.env.local mark-additions-reviewed.mjs --confirm

# 5. review git diff of src/data/, then commit + deploy (manual)
```

Notes:
- `apply-cleanup.mjs` reuses the tested `scripts/lib/resync-puzzles.mjs`, so puzzle
  re-sync is identical to the official apply-nominations path. It is idempotent.
- We **do not** push the 16,933 removals through Supabase/apply-nominations: that
  script filters the 812k list O(n×m) per word (tens of billions of ops + OOM
  risk). Local Set-based filtering does the same job in ~2s.
- "Removing additions from the Supabase list" = setting `reviewed_at = now()` (the
  project convention — rows retained as history, dropped from the apply queue),
  **not** deleting rows. Do it last, after a verified apply, so the two can't desync.
- Regenerating the list (e.g. after a Hunspell update) is not scripted end-to-end
  — re-derive from a fresh `el_GR.dic` per the method above. The committed
  `decisions.json` is authoritative for the current run.
```
