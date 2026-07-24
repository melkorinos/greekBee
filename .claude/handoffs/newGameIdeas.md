# Handoff: New Game Ideas (mini)

**Date:** 2026-07-23
**Status:** Idea backlog — no code yet; capturing a brainstorm before it evaporates
**Goal:** pick the next game(s) to add to the platform after Geography (Taken) shipped

---

## Context

Platform today = mostly word games + one geography game (Taken, which states *where* each photo was
taken). Developer likes word and geography equally, and specifically likes the "where it was taken" hook.

Steer from the brainstorm: **not** traditional word games — wanted **recent / trending / viral** formats
(NYT Games, GeoGuessr spinoffs, daily-share loops). The winning mechanic across all of them is
**one daily puzzle + a shareable emoji-grid result** — that's the growth engine, same shell we already have.

## Shortlist (developer-approved candidates)

**Highest preference right now: Πόσο κάνει; (Costcodle).**

| Game | What it is | Ease of implementation | Daily-puzzle maintenance |
|---|---|---|---|
| **Πόσο κάνει;** ⭐ | Guess a product's price; higher/lower feedback, guess-count + share grid | Easy — simple logic, one photo + price per day | Medium — shoot-your-own photos (no licensing), but prices date → **pin each puzzle to its date** |
| **Trivia daily** | One daily fact-checked Q&A | Easiest — text only, reuses daily+share shell, no images | Hard — consumable-once; runs dry fast; wants crowdsource/batch generation |
| **Τοπωνύμιο** | Place name with hidden letters + a photo hint (word × geo hybrid) | Medium — combines word-guess + photo-hint machinery | Medium — photo + answer per item, but place-name pool is huge & reusable |
| **Ποιο νησί;** | Greek island from a photo (islands-only GeoGuessr) | Medium — trivial logic, needs geotagged photo set | Easy once seeded — finite islands, build library once then rotate |
| **Πρόσωπο fusion** | Photoshop/AI-fuse **two** Greek public figures; guess both | Hardest — fusion image + two-answer UI | Hard — two figures + fused image each time + **likeness/licensing risk** |

Key insight from the two-axis split: maintenance cost is driven by **finite reusable pool**
(islands, place names — cheap to feed) vs **consumable-once content** (a trivia question is burned after
one day — expensive to feed). Trivia is easiest to *build*, hardest to *feed*.

## Rejected / deferred

- **Συνδέσεις (Connections)** — already under development, not part of this backlog.
- **Ελληνικό GeoGuessr** (full Street-View drop) — too hard to implement. "Ποιο νησί;" is the tractable subset.

## Recommended next step

Ship **Πόσο κάνει;** first — lightest code, dodges licensing, matches the developer's top preference.
Before building, decide the one design fork: **prices frozen at puzzle date** vs **meant to be current** —
it changes the content format and the copy players see (recommend: frozen + show the date).

Then spec it as a normal game slice (pure `lib/` logic, own `useGameStore` slice, daily + share grid).
Good next actions: `/grill-with-docs` to pin the design, then `/to-tickets` + `/tdd`.
