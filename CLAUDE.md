# Greek Word Games — Claude Code Project

## Agent context

At the start of every session, read these files in order:

1. `.agents/aiHelper/soul.md` — identity, beliefs, hard constraints, post-feature protocol
2. `.agents/aiHelper/memory.md` — all architecture decisions already made
3. `.agents/aiHelper/goals.md` — phased roadmap; check which phase is current
4. `.agents/aiHelper/reflections.md` — risks and tensions to watch
5. `.agents/aiHelper/log.md` — what has been done in previous sessions

## Standing rules (every session)

- Run `npm run test -- --run`, `npx eslint .`, and `npm run build` after every meaningful change. All must pass (0 failures, 0 errors).
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.
- Game logic (`src/games/*/lib/`) must stay pure functions — zero React imports.
- Each game reads/writes only its own `useGameStore` slice — never touches `localStorage` directly.
- No component graduates to `src/components/shared/` speculatively — only when two games genuinely need it.
- No magic hex values or inline styles — Tailwind utility classes only.
- Do not install new dependencies without explicit approval.
- Keep `.agents/aiHelper/log.md` under 250 lines — condense older entries before adding new.
- Do not touch `words-el.json` or any `puzzles-*.json` unless the task explicitly requires it.

## Available slash commands

All commands live in `.claude/skills/`. Project-specific first, then mattpocock/skills:

| Command | Purpose |
|---------|---------|
| `/aihelper` | Full context reload — reads all `.agents/aiHelper/` files then waits for your task |
| `/improve-codebase-architecture` | Surface architectural seams and deepening opportunities |
| `/grill-me` | Relentless Q&A to stress-test a plan or design |
| `/grill-with-docs` | Grill session that cross-checks against domain docs and updates them inline |
| `/to-prd` | Synthesise current context into a structured PRD |
| `/to-issues` | Break a plan into vertical-slice issues on the issue tracker |
| `/triage` | Move issues through the triage state machine |
| `/diagnose` | Disciplined debug loop — reproduce → hypothesise → fix → regression-test |
| `/tdd` | Test-driven development with red-green-refactor vertical slices |
| `/prototype` | Build a throwaway prototype to answer a design question |
| `/zoom-out` | Map modules and callers when unfamiliar with an area |
| `/handoff` | Compact the conversation into a handoff doc for the next session |
| `/caveman` | Ultra-compressed mode — full technical accuracy, zero filler |
| `/setup-matt-pocock-skills` | One-time setup: issue tracker, triage labels, domain doc layout |
| `/write-a-skill` | Create a new skill with proper structure |
