# Greek Word Games — Claude Code Project

## Agent context

At the start of every session, read these files in order:

1. `.claude/aiHelper/soul.md` — identity, beliefs, hard constraints, post-feature protocol
2. `.claude/aiHelper/memory.md` — all architecture decisions already made
3. `.claude/aiHelper/goals.md` — phased roadmap; check which phase is current
4. `.claude/aiHelper/reflections.md` — risks and tensions to watch
5. `.claude/aiHelper/log.md` — what has been done in previous sessions

There is one more aiHelper file that is deliberately **NOT** in this list: `.claude/aiHelper/coverageMap.md`, the test coverage map. Never read it at session start — open it on demand, only when about to write, move, or consolidate a test: grep it first, and if the function already appears there, extend that test file instead of creating a new one. Update it in the end-of-session Dream.

## Standing rules (every session)

- Run `npm run test -- --run`, `npx eslint .`, and `npm run build` after every meaningful change. All must pass (0 failures, 0 errors).
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.
- Game logic (`src/games/*/lib/`) must stay pure functions — zero React imports.
- Each game reads/writes only its own `useGameStore` slice — never touches `localStorage` directly.
- No component graduates to `src/components/shared/` speculatively — only when two games genuinely need it.
- No magic hex values or inline styles — Tailwind utility classes only.
- **Styling uses semantic tokens** — never literal neutral palette classes (`stone-`/`zinc-`/`gray-`…) or hand-written `dark:` pairs; reuse the recipes instead of re-rolling button/input/tooltip/card strings; frame game pages with `GamePageShell` + `GameHeader`; the content column is `max-w-game`, never a literal `max-w-sm`. Guard tests enforce all of this; the full posture, file locations, and deliberate exceptions live in the memory.md Theming row + ADR 0008/0009.
- **Never hardcode a value that lives in `src/config/`** — import it (`gameRules`, `achievementTuning`, `games`, `platform`, `retention`; details in the memory.md Config row). `RegistryGameId` = every registered game; `SliceId` (`@/types`) = persistence-slice keys only.
- **Never `git push`** (any remote, any branch) — every push triggers a paid Vercel deployment. The developer does all syncs to preview/production personally. Stop after committing and say the branch is ready to push. A deny rule in `.claude/settings.local.json` enforces this.
- Do not install new dependencies without explicit approval.
- **End every session with the Dream** (see soul.md, End-of-Session Dream): condense `log.md`, promote durable lessons into `memory.md`/ADRs, update `reflections.md` and `coverageMap.md`. **Hard caps: `log.md` ≤ 120 lines, `memory.md` ≤ 120 lines.**
- Do not touch `words-el.json` or any `puzzles-*.json` unless the task explicitly requires it.
- **DB schema is version-controlled** in `supabase/migrations/` — change it only via a new committed migration + `npx supabase db push`, never via the dashboard or MCP `apply_migration` alone, or the repo drifts (push mechanics + emergency fallback in the memory.md Supabase row). For inspection/debugging use the Supabase/Vercel MCP tools — load `/project-mcp` first. **One shared Supabase project backs both dev and prod** — treat every write as production.
- When an issue is resolved, **delete its file** from `.claude/issue-tracker/issues/` — do not leave it with a "done" status.
- **Be short.** Optimise for the developer's reading time, not for completeness. Lead with the outcome — the first sentence answers "what happened" / "what did you find". Then stop. Cut: preamble ("Great question!"), recaps of what was just asked, narration of what you're about to do next when the tool call already shows it, options you're not going to take, and closing summaries of a summary. Default to prose with no headers; a two-line answer is a complete answer. Get length down by **including less**, not by compressing wording into fragments, arrow chains (`A → B → fails`), or invented abbreviations — those cost a re-read and a follow-up question, which is the opposite of the goal. Full sentences, spelled-out terms, fewer of them.
- **Be direct.** Grammar loses to brevity — short blunt sentences over polished ones. No hedging, no mumbling, no softening. State it plain.

## Available slash commands

All commands live in `.claude/skills/`. **This table is the whole list** — do not install a skill just because it exists upstream; the only extras beyond the table are three base skills (`grilling`, `domain-modeling`, `codebase-design`) that back the wrappers. **Before any skill maintenance** (`npx skills` update/add/delete, forking, restoring the built-in `/code-review`), read `.claude/aiHelper/skillsNotes.md` — it holds the install/fork/junction traps that otherwise silently revert local edits or resurrect deleted skills.

| Command | Purpose |
|---------|---------|
| `/aihelper` | Full context reload — reads all `.claude/aiHelper/` files then waits for your task |
| `/apply-nominations` | Apply admin-accepted word Nominations to `words-el.json` + re-sync every dictionary-derived data file via the ADR 0015 registry (wraps `npm run apply-nominations[:dry]`) |
| `/improve-codebase-architecture` | Surface architectural seams and deepening opportunities |
| `/grill-with-docs` | Grill session that cross-checks against domain docs and updates them inline |
| `/to-tickets` | Break a plan into vertical-slice tickets on the issue tracker (formerly `/to-issues`) |
| `/diagnosing-bugs` | Disciplined debug loop — reproduce → hypothesise → fix → regression-test (formerly `/diagnose`) |
| `/tdd` | Test-driven development with red-green-refactor vertical slices |
| `/handoff` | Compact the conversation into a handoff doc for the next session |
| `/setup-matt-pocock-skills` | One-time setup: issue tracker, triage labels, domain doc layout |
| `/writing-great-skills` | Reference for writing/editing skills well (formerly `/write-a-skill`) |
| `/project-mcp` | Canonical Supabase & Vercel MCP IDs, call recipes, and param-traps — load before any Supabase/Vercel MCP call to skip discovery thrash |
| `/wayfinder` | Map a body of work too large for one session as decision tickets on the issue tracker, resolved one at a time |
| `/code-review` | mattpocock's review pass. **Shadows the Claude Code built-in of the same name** (incl. `/code-review ultra`) — restore recipe in skillsNotes.md |
| `/research` | Investigate a question against primary sources; captures findings as a Markdown file in the repo |
| `/prototype` | Throwaway prototype to answer a design question (state model or UI shape) before committing to it |

## Issue tracker & domain docs

- Issues are local markdown files under `.claude/issue-tracker/issues/` — see `.claude/issue-tracker/issue-tracker.md`.
- Triage uses the default five-role label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix) — see `.claude/issue-tracker/triage-labels.md`.
- Domain docs: single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `.claude/issue-tracker/domain.md`.
