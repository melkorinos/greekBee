# Handoff — Leksokipos scoring-tier renaming (PAUSED, not implemented)

**Status:** Brainstorm only. **No code changed for the names.** User is still
steering name choices. Paused here on purpose.

## Goal

Rename the 8 Leksokipos scoring tiers. **Drop the flower/garden metaphor entirely.**
New direction: a player **rising through the ranks** — ascending, humorous,
escalating-ego progression (rookie → … → god-tier).

## Hard constraints (decided this session)

- **Thresholds DO NOT change** — only the 8 names do. They stay at
  `0, 6, 12, 20, 30, 42, 55, 80` (% of max score).
- **Gender-neutral.** Greek adjectives / agent-nouns inflect by gender
  (καλός→καλή), so a descriptive rank silently assumes the player is male. Must
  avoid that. **No `καλός/καλή` slash forms** — the user explicitly rejected those.
- **Vibe to keep:** foreign/English words written in Greek letters (οκέι, γκουρού)
  — a youth aesthetic the user loves. **Key insight: loanwords-in-Greek-script are
  invariant**, so they fix gender-neutrality AND deliver the vibe at once. Three
  safe (genderless) categories:
  1. foreign loanwords in Greek script — οκέι, γκουρού, σταρ, γκοντ μοντ
  2. fixed phrases / interjections — έτσι κι έτσι, για πάμε
  3. neuter nouns — θηρίο, τέρας, φαινόμενο

## Current leading proposal (gender-neutral, vibe-matched), 0→80%

1. **ψαράκι** (neuter — newbie / "little fish")
2. **έτσι κι έτσι** (so-so)
3. **οκέι**
4. **για πάμε**
5. **τζάμι** (slang "awesome", invariant)
6. **θηρίο** (beast, neuter)
7. **γκουρού** (guru, invariant)
8. **γκοντ μοντ** (god mode, invariant) — top-tier punchline

User's own first draft was: `ψαράκλας, έτσι κι έτσι, οκέι, για πάμε, καλός,
δυνάρος, βιρτουόζος, Παντογνώστης` — but #1,5,6,7,8 are gendered; the proposal
above de-genders them while keeping the feel. **Names NOT locked** — per-slot swap
menus are in the conversation (e.g. slot 8: γκοντ μοντ · έπος · μπος λέβελ · θεϊκό).

## Implementation when names lock (contained change)

Rank names currently appear in **12 files** (`grep` the old names to find all):
- `src/games/leksokipos/lib/ranking.ts` — the `RANKS` array **and** the two
  literal `"Σπόρος"` fallbacks in `calculateRank()`.
- `src/games/leksokipos/types.ts` — the `RankName` union type.
- `src/games/leksokipos/hooks/gameReducer.ts`, `src/app/page.tsx`,
  `src/components/leksokipos/HowToPlayModal.tsx`,
  `src/components/leksindeseis/ConnectionsBoard.tsx`.
- Tests: `src/test/leksokipos/{GameBoard,gameLogic,gameReducer}.test.tsx`.
- Docs (optional to update): `CONTEXT.md`, `README.md`,
  `.claude/issue-tracker/issues/04-td002-max-score-cap.md`.
- Then run `npm run test -- --run`, `npx eslint .`, `npm run build`.

## Tech-debt note — consolidate shared values (INVESTIGATE LATER)

Surfaced by two pains this session: (a) renaming a rank touches ~12 files, and
(b) the leaderboard 🏆 size differs per game (`text-[1.17rem]`, `text-xl`,
`text-sm`, `text-base`). Both are the same smell — **common values duplicated
instead of sourced from one place.** When picked up:

- **Ranks:** `RANKS` (in `ranking.ts`) is meant to be the source, but the
  `RankName` union in `types.ts` re-types the literals and tests/docs hardcode
  them. Look into deriving `RankName` from `RANKS` (e.g.
  `type RankName = typeof RANKS[number]["name"]`) so names live in ONE spot.
- **Icon / trophy sizes:** the leaderboard cup is sized ad-hoc in each game.
  Consider a shared size token (a constant or a shared Tailwind class) so "make
  the cup bigger" is a one-line change everywhere.
- **Wider audit:** sweep the repo for other scattered constants that should be
  centralised for consistency + easy updating — fonts, colours, spacing, shared
  Tailwind tokens, rank thresholds. Consider a small design-tokens / theme module.
- Respect `CLAUDE.md`: no speculative `shared/` graduation, Tailwind utilities
  only (no inline styles / magic hex). Keep it driven by real duplication.

## Also pending in working tree — UNCOMMITTED

`src/components/leksokipos/ScoreBar.tsx` (icon resize, already done, needs commit):
- Leaderboard 🏆 → `text-[1.17rem]` (~+34% vs original `text-sm`).
- The 3-bar rank-ladder `RankIcon` SVG → `17.6 × 15.4` (+10%, viewBox unchanged).

## Other open thread — DB backup (optional, NOT started)

Full Supabase backup via the Supabase CLI ("option C"). No install needed —
`npx supabase`. User must provide the **Session-pooler connection string**
(Dashboard → Settings → Database → Connection string → *Session pooler* URI; it is
IPv4-friendly, port **5432** — NOT the IPv6 "Direct" host, NOT the transaction
pooler on 6543). It contains the DB password. Then dump into a **gitignored**
`db-backups/<timestamp>/`:

```bash
npx supabase db dump --db-url "<conn>" -f roles.sql  --role-only
npx supabase db dump --db-url "<conn>" -f schema.sql
npx supabase db dump --db-url "<conn>" -f data.sql   --data-only
```

Also outstanding: user intends to **rotate the `sb_secret_` service key** (it was
pasted in chat) — deferred, accepted as low risk for a personal project.
