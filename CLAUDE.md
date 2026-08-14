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
- **Run `npm run test:e2e` before saying a branch is ready to push** whenever the change touched a page, layout, route, or shared chrome component. Playwright otherwise only runs in CI, so a stale selector stays invisible until after the merge — which is exactly how the `getByRole("link")` guard in `e2e/profile.spec.ts` survived the header's Link→button change. Local runs use the dev server and need no build.
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.
- Game logic (`src/games/*/lib/`) must stay pure functions — zero React imports.
- Each game reads/writes only its own `useGameStore` slice — never touches `localStorage` directly.
- No component graduates to `src/components/shared/` speculatively — only when two games genuinely need it.
- No magic hex values or inline styles — Tailwind utility classes only.
- **Styling uses semantic tokens** — never literal neutral palette classes (`stone-`/`zinc-`/`gray-`…) or hand-written `dark:` pairs; reuse the recipes instead of re-rolling button/input/tooltip/card strings; frame game pages with `GamePageShell` + `GameHeader`; the content column is `max-w-game`, never a literal `max-w-sm`. Guard tests enforce all of this; the full posture, file locations, and deliberate exceptions live in the memory.md Theming row + ADR 0008/0009.
- **Never hardcode a value that lives in `src/config/`** — import it (`games`, `gameRules`, `achievementTuning`, `platform`, `retention`, `sound`, `featureFlags`; details in the memory.md Config row). `RegistryGameId` = every registered game; `SliceId` (`@/types`) = persistence-slice keys only.
- **Never `git push`** (any remote, any branch) — every push triggers a paid Vercel deployment. The developer does all syncs to preview/production personally. Stop after committing and say the branch is ready to push. A deny rule in `.claude/settings.local.json` enforces this.
- Do not install new dependencies without explicit approval.
- **End every session with the Dream** (see soul.md, End-of-Session Dream): condense `log.md`, promote durable lessons into `memory.md`/ADRs, update `reflections.md` and `coverageMap.md`. **Hard caps: `log.md` ≤ 120 lines, `memory.md` ≤ 120 lines.**
- Do not touch `words-el.json` or any `puzzles-*.json` unless the task explicitly requires it.
- **DB schema is version-controlled** in `supabase/migrations/` — change it only via a new committed migration + `npx supabase db push`, never via the dashboard or MCP `apply_migration` alone, or the repo drifts (push mechanics + emergency fallback in the memory.md Supabase row). For inspection/debugging use the Supabase/Vercel MCP tools — load `/project-mcp` first. **One shared Supabase project backs both dev and prod** — treat every write as production.
- When an issue or ticket is resolved, **delete its file** from `.claude/tracker/` — no "done" status, no archive folder. Git history is the archive.
- **Do not install a skill just because it exists upstream.** All commands live in `.claude/skills/`; the three base skills (`grilling`, `domain-modeling`, `codebase-design`) back the wrappers. The authoritative list of what each command does is the slash-command table in `README.md`. **Before any skill maintenance** (`npx skills` update/add/delete, forking, restoring the built-in `/code-review`), read `.claude/aiHelper/skillsNotes.md` — it holds the install/fork/junction traps that otherwise silently revert local edits or resurrect deleted skills. Note `/code-review` **shadows the Claude Code built-in of the same name** (incl. `/code-review ultra`) — restore recipe in skillsNotes.md.
- **Word budget.** Under 80 words for a question, under 150 for a report on work done. Over budget means cut content, not compress wording — full sentences and spelled-out terms always, never fragments, arrow chains (`A → B → fails`), or invented abbreviations. If the answer genuinely needs more, say so in one line and ask before writing it.
- **First sentence is the answer.** "What happened" / "what did you find" / "yes or no", before any context. If the first sentence is setup, delete it and start again.
- **Never include, unless asked:** provenance (which file, migration, or ADR taught you this), self-corrections about your own earlier turns, meta-lessons about process, options you're not taking, restatements of the question, narration of the next tool call, or a closing summary of what you just said. A table needs three or more rows to beat a sentence — otherwise write the sentence.
- **One offer at the end, max one line.** "I can do X, say the word." No menus, no trade-off analysis unless asked.
- **ELI5 for technical answers.** When the answer turns on a DB, infra, or architecture concept the developer may not use daily, add one final line: `ELI5: <plain-language analogy or restatement, one sentence>`. One per answer, only when the concept is genuinely non-obvious — not for things already familiar from this codebase.
- **Be direct.** Grammar loses to brevity — short blunt sentences over polished ones. No hedging, no mumbling, no softening. State it plain.

## Tracker & domain docs

Everything lives under `.claude/tracker/` — full conventions and both file templates in `.claude/tracker/README.md`. Two folders, and the distinction is the whole point:

- **`issues/`** (`ISSUE-NN-<slug>.md`) — known defects and risks whose fix is **deferred**. Each carries `Deferred:` and `Revisit when:`. An issue is not an idea or a feature request — those go in `goals.md` or a handoff, or the folder silts up.
- **`tickets/`** (`TICKET-NN-<slug>.md`) — work that is **ready for an agent to pick up cold and execute**. Each carries `Status: ready | in-progress` and, when relevant, `Blocked by:`. `/to-tickets` writes these.

Separate number sequences per folder — `ISSUE-01` and `TICKET-01` are unrelated files, so always say which. **No triage labels** anywhere; the folder is the state.

- **Nothing enters `tickets/` without all four of**: a why, an explicit scope checklist, a spec link, and a done-when. Missing any one means it is an issue, or a question for `/grill-with-docs` — not a ticket.
- **Promotion is a move**, never a copy: a deferred problem that becomes worth doing moves into `tickets/`, gets the next `TICKET-NN`, and is rewritten to the ticket template.
- **File issues autonomously, but announce them.** When a session finds a real problem it is not fixing, it writes the issue itself and then says so in its reply, in one line, so the operator can review it.
- **Open questions are neither.** They live in `.claude/handoffs/` — currently `launch-readiness.md`, which holds the three unresolved launch questions. Read it before assuming an open question is untracked. Resolving one produces an ADR or `CONTEXT.md` entry plus, usually, tickets. Wayfinder is retired; there is no map.
- Domain docs: single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `.claude/tracker/domain.md`.
