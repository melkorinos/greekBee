# ADR 0001 — Leksikastirio admin approval marks DB status; CLI applies word-list changes

**Status**: Accepted

## Context

Leksikastirio allows admins to approve or reject Nominations (words proposed for addition or removal from `words-el.json`). The word list is a static JSON file checked into the repo. There were three realistic options for what "approve" does:

- **A (DB override at runtime)**: Write approved words to a Supabase table; game reads both the static JSON and the DB at runtime.
- **B (auto-deploy)**: Approval calls a server endpoint that patches the file and triggers a Vercel deploy.
- **C (mark + CLI)**: Approval sets `status = "accepted"` in the DB; a separate CLI script reads accepted rows, patches the JSON files, and the developer deploys.

## Decision

Option C. Admin approval is purely a DB status change. A CLI script (to be written) reads `word_suggestions` rows where `status = "accepted"` and `reviewed_at IS NULL`, patches `src/data/words-el.json` (and optionally `src/data/leksiarxeio/words-N.json`), marks rows `reviewed_at = now()`, and the developer deploys.

## Reasons

- `words-el.json` is the single source of truth for the word list. Option A splits that truth across a file and a DB table, adding a runtime DB read to every puzzle computation.
- Option B is fragile: it couples a user-facing action to CI/CD infrastructure.
- Option C keeps the static file authoritative, adds zero runtime overhead, and the CLI gives the developer a natural review checkpoint before any word actually ships.

## Consequences

- The approve button in Admin Mode does not immediately affect the live word list — a deploy is required.
- The CLI script must be written and documented (env var: `SUPABASE_SERVICE_ROLE_KEY`).
- A future team member seeing "accepted" rows in the DB without a corresponding word in the JSON should check whether the CLI has been run.

## Revision — 2026-05-29: expanded CLI scope, length-based routing

The CLI script (`apply-nominations.mjs`) now patches all applicable files, not just `words-el.json`:

- Words of length ≤ 3 → `words-el.json` only
- Words of length 4–8 → `words-el.json` **and** `src/data/leksiarxeio/words-{N}.json`
- `direction: "remove"` cascades to all files the word appears in

`words-el.json` is now the unified word list (2+ letters). `words-el-short.json` has been merged in and deleted.

An agent skill (`/apply-nominations`) wraps the full flow: fetch accepted nominations → patch files → run tests + lint → print diff summary. Developer still owns the commit and deploy step.

The core decision (mark in DB, CLI applies, developer deploys) is unchanged.
