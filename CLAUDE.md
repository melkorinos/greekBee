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
- **Never hardcode a value that lives in `src/config/`** — import it. `gameRules.ts` (numeric knobs: lengths, max-guesses, score caps), `games.ts` (`GAME_REGISTRY`/`RegistryGameId`), `platform.ts` (brand), `retention.ts` (DB windows). `RegistryGameId` = every registered game; `SliceId` (`@/types`) = persistence-slice keys only.
- Do not install new dependencies without explicit approval.
- Keep `.claude/aiHelper/log.md` under 250 lines — condense older entries before adding new.
- Do not touch `words-el.json` or any `puzzles-*.json` unless the task explicitly requires it.
- **DB schema is version-controlled** in `supabase/migrations/` (authoritative DDL + RLS; `CONTEXT.md` documents purpose only). Change it via a new migration applied with `npx supabase db push` — never via the Supabase dashboard or MCP `apply_migration` without committing a matching migration file, or the repo drifts. The `supabase` CLI is an approved devDependency. (`db pull`/`db reset`/local stack need Docker, which is not installed and not required for `db push`.)
- When an issue is resolved, **delete its file** from `.claude/issue-tracker/issues/` — do not leave it with a "done" status.

## Available slash commands

All commands live in `.claude/skills/`. Project-specific first, then mattpocock/skills:

| Command | Purpose |
|---------|---------|
| `/aihelper` | Full context reload — reads all `.claude/aiHelper/` files then waits for your task |
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

## Agent skills

### Issue tracker

Issues live as local markdown files under `.claude/issue-tracker/issues/`. See `.claude/issue-tracker/issue-tracker.md`.

### Triage labels

Using the default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `.claude/issue-tracker/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `.claude/issue-tracker/domain.md`.
