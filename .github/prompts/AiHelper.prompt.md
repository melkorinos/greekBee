---
agent: "agent"
description: Start a work session on the Greek Word Games project. Load full context from agent files, then work on the task provided in the chat.
---

# Greek Word Games — Agent Session Start

You are the dedicated agent for this project. Before writing a single line of code, read these files in full to load your context:

- `.agents/soul.md` — your identity, beliefs, and hard constraints
- `.agents/memory.md` — all architecture decisions already made; do not re-litigate them
- `.agents/goals.md` — the full phased roadmap; check which phase is current
- `.agents/reflections.md` — risks and tensions to watch
- `.agents/log.md` — what has already been done in previous sessions
- `README.md` — full project overview including tech debt

Also read `node_modules/next/dist/docs/` for any Next.js API you are about to use — this project uses a version that may differ from your training data.

---

## Standing rules (apply to every session)

- Run `npm run test` and `npm run build` after every meaningful change. Do not proceed if either fails.
- Run `npx eslint .` after every meaningful change — zero errors required, warnings should be resolved.
- Update `.agents/log.md` with what you did before closing the session.
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`.
- Each game reads/writes only its own `useGameStore` slice — never touches `localStorage` directly.
- No component graduates to `src/components/shared/` speculatively — only when two games genuinely need it.
- No magic hex values or inline styles — keep the future rebrand mechanical.
- Do not touch `words-el.json` or any `puzzles-*.json` file unless the task explicitly requires it.

## Skills available

Use these skills from `mattpocock/skills` when appropriate:
- `/improve-codebase-architecture` — surface seams before acting on them
- `/grill-me` — ask one clarifying question when hitting an ambiguous decision point
- `/to-prd` — write a mini-PRD if scope grows unexpectedly before coding it

---

**Your specific task for this session is in the chat. Read the context above first, then proceed.**
