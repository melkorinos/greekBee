# apply-nominations writes accepted words into the dictionary without re-checking the blocklist

Status: ready-for-agent

## Triage decisions (2026-07-17)

- Ticket's shape confirmed as-is: apply-time re-check via `isBlockedWord`, hit = loud failure that
  stops the run (no silent skip), `--dry` reports identically.
- Heads-up from issue 06's triage: the 14 month names stay in both files as a deferred allowlist,
  so the apply-time check must use the same allowlist to avoid false stops.

**Issue 06 has LANDED (session 97).** The allowlist is real and importable — do not re-derive it:

```ts
import { DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP, isBlockedWord } from "@/lib/nominationBlocklist";
```

The 14 month names are in BOTH `nominations-blocklist.json` and `words-el.json` on purpose, so a
naive `isBlockedWord` filter at apply-time would loudly stop a run over a word that is deliberately
in both. Exempt the allowlist from the loud failure. Note `ατλασ`/`ορκα` are no longer blocklisted
(removed as false positives in 06), so they are nominatable and must pass the check.

## The one-sentence version

`scripts/apply-nominations.ts` never calls `isBlockedWord`, so the blocklist is enforced only at
propose-time — an accepted row whose word is blocklisted *later* (or was accepted *before* the
blocklist existed) gets written straight into `words-el.json` with nothing in the way.

## The evidence (verified 2026-07-17)

- `grep -i "blocklist\|isBlockedWord" scripts/apply-nominations.ts` → **no matches**. The script has
  no knowledge of the blocklist at all.
- The blocklist is checked in exactly two places, both propose-time and both edge routes:
  - `src/app/api/nominations/route.ts:127-129` — POST rejects a blocklisted add with 422
  - `src/app/api/nominations/lookup/route.ts:42-52` — lookup returns `blocked: true`

Both gates run when the player submits. Neither runs when an admin approves, and neither runs when
the approved word is applied. Between those moments the blocklist is a version-controlled JSON file
that anyone can edit — its whole stated advantage (`nominationBlocklist.ts:5-7`: "stored as a
version-controlled data file so a new migration/deploy isn't needed to edit it") is exactly what
makes it mutable between propose and apply.

## The failure path

1. A word is proposed and accumulates votes while it is *not* on the blocklist.
2. An admin approves it → row goes to `status: accepted`, waiting for the next release.
3. Someone adds that word to the blocklist (a name/place slips through, gets reported, gets listed).
4. `npm run apply-nominations` runs and writes it into `words-el.json` anyway.

Nothing detects this. The word is now in the dictionary *and* on the blocklist — which is issue 06's
exact broken state (resolved in session 97; see `.claude/aiHelper/log.md`), arrived at automatically
rather than by hand. Note 06's guard test now catches this state *after the fact* — but only on the
next test run, and only after the bad data is committed. This ticket closes the door instead.

## Severity

Low likelihood, high blast radius, and silent. Applying is the last irreversible step before every
dictionary-derived data file gets re-synced across all games (ADR 0015), so a bad word propagates
everywhere in one command and only comes back out through another full apply cycle.

## Shape of the fix

Make apply-time re-check the blocklist, treating it as authoritative at the moment of the write:

- In `apply-nominations.ts`, filter accepted `direction=add` rows through `isBlockedWord` before
  they reach the dictionary writer.
- A hit is a **loud failure, not a silent skip** — report the word and stop, so a human decides
  whether the blocklist or the approval is wrong. Silently dropping it would leave the row `accepted`
  forever and re-trigger every run.
- Cover it in `src/test/scripts/applyDictionaryEdits.test.ts`: an accepted add-row that is
  blocklisted must not be written, and must fail the run.
- Check `--dry` reports it identically (that's the run an admin actually reads before applying).

## References

- `scripts/apply-nominations.ts` — the script with no blocklist check
- `src/lib/nominationBlocklist.ts:5-7` — the "editable without a deploy" property that opens the window
- `src/test/scripts/applyDictionaryEdits.test.ts` — where the regression test belongs
- `docs/adr/0015-premade-data-resync-registry.md` — what an applied word fans out into
