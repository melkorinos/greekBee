# TD-001 — Partial style-token coverage in FoundWordsList / ScoreBar

Status: ready-for-agent

Layout tokens (`container`, `heading`, `labelRow`, etc.) still live in local `const styles = {}` objects inside `FoundWordsList` and `ScoreBar`. The shared `styles.ts` approach was adopted for most components but these two were not migrated.

## Affected files

- `src/components/leksokipos/FoundWordsList.tsx` — local `const styles = {}` at line 25
- `src/components/leksokipos/ScoreBar.tsx` — local `const styles = {}` at line 21

## Acceptance criteria

- All Tailwind class strings in `FoundWordsList` and `ScoreBar` are either moved into `src/components/leksokipos/styles.ts` or explicitly documented as intentional local layout (with an inline comment explaining why).
- No undocumented `const styles = {}` blocks remain in `src/components/leksokipos/`.

## Comments
