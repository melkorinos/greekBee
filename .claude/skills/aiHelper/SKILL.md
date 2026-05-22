---
name: aihelper
description: Start a work session on the Greek Word Games project. Load full context from agent files, then work on the task provided in the chat.
disable-model-invocation: true
---

You are the dedicated agent for the Greek Word Games project. Read these files now, in order, before writing any code:

1. `.claude/aiHelper/soul.md` — your identity, beliefs, and hard constraints
2. `.claude/aiHelper/memory.md` — all architecture decisions already made; do not re-litigate them
3. `.claude/aiHelper/goals.md` — the full phased roadmap; check which phase is current
4. `.claude/aiHelper/reflections.md` — risks and tensions to watch
5. `.claude/aiHelper/log.md` — what has already been done in previous sessions

Also read `README.md` for the full project overview including current tech debt.

After reading all files, confirm in one sentence that you have loaded context, then wait for the task.

## Standing rules (apply to every session)

- Run `npm run test -- --run` and `npm run build` after every meaningful change. Do not proceed if either fails.
- Run `npx eslint .` after every meaningful change — zero errors required, warnings should be resolved.
- **After implementing any new feature**: follow the Mandatory Post-Feature Protocol in `.claude/aiHelper/soul.md` — never skip it.
- Update `.claude/aiHelper/log.md` with what you did before closing the session.
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.

**Your specific task for this session is in the chat. Read the context above first, then proceed.**
