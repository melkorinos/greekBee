# Greek Word Games — Claude Code Project

## Agent context

At the start of every session, read these files in order:

1. `.claude/aiHelper/soul.md` — identity, beliefs, hard constraints, post-feature protocol
2. `.claude/aiHelper/memory.md` — all architecture decisions already made
3. `.claude/aiHelper/goals.md` — phased roadmap; check which phase is current
4. `.claude/aiHelper/reflections.md` — risks and tensions to watch
5. `.claude/aiHelper/log.md` — what has been done in previous sessions

## Standing rules (every session)

- Run `npm run test -- --run`, `npx eslint .`, and `npm run build` after every meaningful change. All must pass (0 failures, 0 errors).
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.
- Game logic (`src/games/*/lib/`) must stay pure functions — zero React imports.
- Each game reads/writes only its own `useGameStore` slice — never touches `localStorage` directly.
- No component graduates to `src/components/shared/` speculatively — only when two games genuinely need it.
- No magic hex values or inline styles — Tailwind utility classes only.
- **Styling uses semantic tokens** (`bg-surface`, `text-muted`, `border-border`, `bg-inverted`, `text-correct`…), never literal neutral palette classes (`stone-`/`zinc-`/`gray-`…) or hand-written `dark:` pairs (ADR 0008). Composite recipes live in `src/styles/recipes.ts` (cross-game) / `src/components/leksokipos/styles.ts` (Leksokipos-only) — reuse them, don't re-roll button/input/label strings. Intentional non-token exceptions are enumerated in ADR 0008 and guarded by `noRawPaletteClasses.test.ts`; add a new one only by editing that allowlist + the ADR.
- **Never hardcode a value that lives in `src/config/`** — import it. `gameRules.ts` (numeric knobs: lengths, max-guesses, score caps), `achievementTuning.ts` (achievement trigger thresholds/scales/rates — balance knobs), `games.ts` (`GAME_REGISTRY`/`RegistryGameId`), `platform.ts` (brand), `retention.ts` (DB windows). `RegistryGameId` = every registered game; `SliceId` (`@/types`) = persistence-slice keys only.
- Do not install new dependencies without explicit approval.
- Keep `.claude/aiHelper/log.md` under 250 lines — condense older entries before adding new.
- Do not touch `words-el.json` or any `puzzles-*.json` unless the task explicitly requires it.
- **DB schema is version-controlled** in `supabase/migrations/` (authoritative DDL + RLS; `CONTEXT.md` documents purpose only). Change it via a new migration applied with `npx supabase db push` — never via the Supabase dashboard or MCP `apply_migration` without committing a matching migration file, or the repo drifts. The `supabase` CLI is an approved devDependency. (`db pull`/`db reset`/local stack need Docker, which is not installed and not required for `db push`.) The repo is **not** `supabase link`ed, so for inspection/debugging use the **Supabase and Vercel MCP tools** (the chosen interface): `list_migrations`, `list_tables`, `get_advisors`, `get_logs`, `execute_sql` for the DB; deployment/runtime-log tools for Vercel. Read-only MCP calls are allowlisted; mutating ones (`execute_sql`, `apply_migration`, `deploy_*`) still prompt — **one shared Supabase project backs both dev and prod** (see aiHelper memory), so treat every write as production.
- When an issue is resolved, **delete its file** from `.claude/issue-tracker/issues/` — do not leave it with a "done" status.
- **Be short.** Optimise for the developer's reading time, not for completeness. Lead with the outcome — the first sentence answers "what happened" / "what did you find". Then stop. Cut: preamble ("Great question!"), recaps of what was just asked, narration of what you're about to do next when the tool call already shows it, options you're not going to take, and closing summaries of a summary. Default to prose with no headers; a two-line answer is a complete answer. Get length down by **including less**, not by compressing wording into fragments, arrow chains (`A → B → fails`), or invented abbreviations — those cost a re-read and a follow-up question, which is the opposite of the goal. Full sentences, spelled-out terms, fewer of them.

## Available slash commands

All commands live in `.claude/skills/`. Project-specific first, then mattpocock/skills:

> **Skill install note:** mattpocock skills are managed by `npx skills@latest add mattpocock/skills` (tracked in `skills-lock.json`). Some are thin **wrappers** that delegate to base skills — `/grill-with-docs` → `grilling` + `domain-modeling`. Those base skills must be installed too, or the wrapper loads with no content behind it. The updater only fetches what's in `skills-lock.json`, so a missing base skill needs an explicit `npx skills@latest add mattpocock/skills/skills/<path>/<name>` (which also pins it). If a `/command` loads but does nothing, check for a missing base skill first.
>
> **Everything in `.claude/skills/` is committed** (policy changed 2026-07-16; previously the vendored copies were gitignored). A fresh clone therefore has working skills without running `npx skills`. When the updater does change something, it lands as a reviewable git diff — check it rather than committing it blind.
>
> **Forked skills:** `grilling` and `to-tickets` started upstream but are locally modified, so they are deliberately **absent from `skills-lock.json`** — that is the only thing stopping the updater from reverting the edits. Do not re-add them to the lock. `grilling` diverges on purpose (batches of ≤5 questions + ELI5 offers, where upstream mandates one-at-a-time); `to-tickets` points its follow-up at `/tdd` because `/implement` is not installed here.
>
> **`.agents/skills/` is not the skills folder.** `npx skills` installs there first (vendor-neutral location) and mirrors into `.claude/skills/`; Claude Code never reads it. It stays gitignored. Deleting a skill means deleting it from **both** trees — a stale copy in `.agents/skills/` is what re-mirrors a skill you thought you removed, or overwrites a fork.

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

**This table is the whole list.** Pruned to it on 2026-07-16 (42 skill folders → 14). The only things in `.claude/skills/` beyond the table are three **base skills** with no slash command of their own, kept solely because the wrappers above are empty without them:

- `grilling` + `domain-modeling` — backing `/grill-with-docs`
- `codebase-design` — architecture vocabulary for `/improve-codebase-architecture` (which also runs `grilling` + `domain-modeling`)

Do not install a mattpocock skill just because it exists upstream — add one only when a real task needs it. Note that `/code-review` is a **Claude Code built-in**; upstream ships a `code-review` skill of the same name that shadows it. Don't reinstall it. Ditto `research`/`prototype`, which overlap the built-in `/verify` and `/simplify`. Upstream dropped `caveman` and `zoom-out` with no replacement (removed here, 2026-07-14).

## Agent skills

### Issue tracker

Issues live as local markdown files under `.claude/issue-tracker/issues/`. See `.claude/issue-tracker/issue-tracker.md`.

### Triage labels

Using the default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `.claude/issue-tracker/triage-labels.md`. The vocabulary stays in use (`/to-tickets` applies `ready-for-agent`) even though the `/triage` skill itself is not installed here.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `.claude/issue-tracker/domain.md`.
