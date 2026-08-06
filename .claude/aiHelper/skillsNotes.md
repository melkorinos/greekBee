# Skills maintenance notes

> Read this before any skill maintenance: `npx skills` update/add/delete, forking a skill, or restoring the built-in `/code-review`. Not needed for merely *using* skills — the **README slash-command table** is the authoritative list for that. Moved out of CLAUDE.md 2026-07-18.

**Skill install note:** mattpocock skills are managed by `npx skills@latest add mattpocock/skills` (tracked in `skills-lock.json`). Some are thin **wrappers** that delegate to base skills — `/grill-with-docs` → `grilling` + `domain-modeling`. Those base skills must be installed too, or the wrapper loads with no content behind it. The updater only fetches what's in `skills-lock.json`, so a missing base skill needs an explicit `npx skills@latest add mattpocock/skills/skills/<path>/<name>` (which also pins it). If a `/command` loads but does nothing, check for a missing base skill first.

**Everything in `.claude/skills/` is committed** (policy changed 2026-07-16; previously the vendored copies were gitignored). A fresh clone therefore has working skills without running `npx skills`. When the updater does change something, it lands as a reviewable git diff — check it rather than committing it blind.

**Forked skills:** `grilling` and `to-tickets` started upstream but are locally modified, so they are deliberately **absent from `skills-lock.json`** — that is the only thing stopping the updater from reverting the edits. Do not re-add them to the lock. `grilling` diverges on purpose (batches of ≤5 questions + ELI5 offers, where upstream mandates one-at-a-time); `to-tickets` points its follow-up at `/tdd` because `/implement` is not installed here.

**`.agents/skills/` is not the skills folder.** `npx skills` installs there first (vendor-neutral location) and mirrors into `.claude/skills/`; Claude Code never reads it. It stays gitignored. Deleting a skill means deleting it from **both** trees — a stale copy in `.agents/skills/` is what re-mirrors a skill you thought you removed, or overwrites a fork.

**Pruning history:** the curated table became the whole list on 2026-07-16 (42 skill folders → 14), then `/wayfinder`, `/code-review`, `/research` and `/prototype` were added on 2026-07-17 → **18 folders in `.claude/skills/` today**. Upstream dropped `caveman` and `zoom-out` with no replacement (removed here, 2026-07-14).

**`/code-review` resolves to the mattpocock skill, not the built-in** (installed 2026-07-17, deliberately reversing the earlier "don't reinstall it" rule). The cost is that the built-in `/code-review` is unreachable while the skill is installed — including **`/code-review ultra`**, the multi-agent cloud review. To get the built-in back, delete `code-review` from **both** `.claude/skills/` and `.agents/skills/` and drop it from `skills-lock.json`.

**`/research` and `/prototype` overlap the built-in `/verify` and `/simplify`** but do not collide by name, so all four are reachable. Installed 2026-07-17 alongside `/wayfinder` by explicit request.

**Junctions, not copies:** `npx skills` now links `.claude/skills/<name>` → `.agents/skills/<name>` rather than copying (`/wayfinder`, `/code-review`, `/research`, `/prototype`; the older skills are real directories). Git follows the junction and commits the real files, so the "everything committed" rule still holds — but editing either path edits the same file, so a local fork of a junction skill cannot be protected the way `grilling` and `to-tickets` are.
