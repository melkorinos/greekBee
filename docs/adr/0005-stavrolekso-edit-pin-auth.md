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
- The PIN is stored plain — acceptable for this content type, consistent with how TransferCode is stored.
- If a stronger auth model is added later (e.g. email, magic link), the PIN column can be deprecated without a schema migration — it simply stops being checked.
