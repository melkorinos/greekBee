# ADR 0005 — Stavrolekso creator edit access via creator-chosen PIN

**Status**: Accepted

## Context

The Stavrolekso maker lets community members submit crosswords for admin approval. A submission can be edited while still `pending`. The platform has no user accounts — identity is DeviceId (browser-local) or TransferCode (single-use migration token). Three options were considered for authenticating edit access:

- **A (DeviceId-scoped)**: Store `device_id` at submission; same browser = automatic edit access. Different device or cleared browser = permanently locked out.
- **B (generated token)**: Generate a random 6-char token at submission (TransferCode format); show it once; creator stores it.
- **C (creator-chosen PIN)**: Creator picks their own alphanumeric PIN (4–8 chars) at submission time; stored plain alongside the puzzle; edit URL requires puzzle ID + PIN.

## Decision

Option C. Creator picks their own PIN at submission. The PIN is stored plain on the `community_stavrolekso_puzzles` row. Edit access requires both the puzzle's serial ID and the PIN — neither is useful without the other. A "generate random" button is provided as fallback. Edit is locked once the puzzle status changes from `pending`.

## Reasons

- Option A breaks on device switch or browser clear — a real risk for desktop-focused crossword construction that may span multiple sessions.
- Option B (random token) has the same UX cost as Option C but is worse: a random string is harder to remember and the creator has no sense of ownership over it.
- PIN + ID gives sufficient security for low-stakes content (it's a crossword, not financial data). Brute-forcing the PIN requires knowing the puzzle ID first.
- Creator-chosen PIN is consistent with how this platform generally avoids hard-to-recover-from anonymous identity decisions.

## Consequences

- Losing both the puzzle ID and PIN means the creator cannot edit; they'd need to resubmit from scratch.
- The PIN is stored plain — acceptable for this content type, consistent with how TransferCode is stored. But "stored plain" only holds as long as the column is unreadable: this decision makes `edit_pin` a secret, and a secret in a column anon can `SELECT` is not one. The baseline granted anon table-wide SELECT, which made every pending puzzle's PIN readable from the public anon key until migration `20260717120000` narrowed the grant to the public browse columns. A column-level GRANT — not RLS, which cannot filter columns — is what enforces this, and only the server-side PIN check may read it.
- If a stronger auth model is added later (e.g. email, magic link), the PIN column can be deprecated without a schema migration — it simply stops being checked.

## Amendment 2026-08-14 (s152) — what shipped is Option B's mechanism under Option C's rules

**The maker has never let a creator pick a PIN.** It generates a random 6-character one on mount
(`randomPin()`, an ambiguity-free alphabet with no `I`/`l`/`O`/`0`), displays it with a copy button,
and offers no input to change it — so the "generate random button as fallback" above is in fact the
only path, and the decision's own Option B ("generate a random 6-char token, show it once") is what
the code does. The distinction survives in one place that matters: `EDIT_PIN_PATTERN` still accepts
any 4–8 alphanumeric string, so the **wire** and the **routes** honour Option C and a creator-chosen
PIN could be re-enabled with a single input, no migration and no route change.

This is recorded rather than fixed because the security reasoning above is unaffected — a generated
PIN is strictly stronger than a chosen one — but Reason 4 ("creator-chosen … sense of ownership")
describes a UI that does not exist, and the ADR's title does too.

Found while fixing a real bug in the same lines: `resetAll` set the PIN to `""` rather than a fresh
one, so after submitting a puzzle, "Δημιούργησε νέο παζλ" left the maker in a state where **every
subsequent submit failed** `EDIT_PIN_ERROR` with no way to refill the field. Fixed in s152; the
generated-not-chosen design is exactly why it was unrecoverable without a reload.
