# Agent Reflections — Greek Word Games Platform

## ⚠️ Active Tensions (watch these)

### 🟡 Vercel Fluid Active CPU (primary cost constraint)
After 5 active days, Fluid Active CPU was already at 21m 7s vs a 4h/day pro-rated cap.  
Known mitigations applied (Session 25):
- Module-level `validWordsCache` in `buildCustomPuzzle` — warm instances skip the ~795 k word scan.
- `export const revalidate = 3600` on `[center]/[outer]` — CDN caches full page HTML.
- All API routes moved to Edge runtime (`export const runtime = "edge"`).

Stripping `validWords` from `puzzles-el.json` was evaluated and rejected: saving ~4–10 ms of JSON
parse time is outweighed by adding ~50–200 ms of dictionary computation on first request per puzzle.

### Leksindeseis puzzle supply (`puzzles-connections.json`)
Community-submitted Leksindeseis puzzles are the primary source, with `puzzles-connections.json` as the static fallback. The fallback pool is thin — operator must manually add new dated entries. No reminder system exists. Add a cron check or at minimum document the procedure clearly before going to production.

### Leksindeseis "one away" UX gap
The reducer detects "one away" and sets feedback text, but `GroupGrid` has no visual highlight indicating _which_ group the player is close to. NYT shows colour intensity. Consider adding in Phase 4 polish.

### Custom URL word count warning
The `/leksokipos/[center]/[outer]` route shows a banner if `validWords.length < 5`, but there is no lower bound that triggers a 404 — a player can construct a URL that yields 0 valid words. The UX is honest (warning banner), but consider whether to 404 on 0-word combos instead.

### Greek letters in URLs
Modern messaging apps (WhatsApp, Telegram, iMessage) and all mainstream browsers handle Greek path segments correctly via IRI/percent-encoding. Edge risk: some old email clients or corporate proxies may mangle `%CE%B1`-style sequences. Acceptable for the current use case; document if a user reports it.

### 🟡 API rate limiting (accepted risk)
All INSERT-capable API routes write to Supabase with no per-device throttle. RLS policies allow unlimited anon inserts. At current scale this is acceptable — the most likely abuse vector is an accidental client bug, not coordinated attack. Decision: **accept risk and monitor** (Option C). Set a Supabase row-count alert on `game_scores` at 50 000 rows and `nominations` at 5 000 rows; revisit with Redis sliding-window rate limiting when DAU exceeds ~500. Alert must be configured in the Supabase dashboard by the operator.

### Mobile input path for Leksiarxeio
`window.keydown` works on desktop. The on-screen Keyboard component handles mobile. There is no test verifying the on-screen keyboard dispatches correctly end-to-end.

---

## ✅ Resolved Tensions (archive)

- **`dark:` Tailwind classes** — re-enabled safely via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. The prefix fires only when `.dark` is on `<html>` (never from `prefers-color-scheme`). `useTheme` hook owns the toggle; preference lives in `localStorage["theme-preference"]` outside the game-state envelope. ADR 0002 documents the decision ✅
- **`FeedbackBanner` graduation** — triggered by Leksindeseis needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — stays in `src/games/leksokipos/lib/normalize.ts` for now; Leksiarxeio imports it directly. Graduate to `src/lib/normalize.ts` when a third game needs it ✅ (tracked)
- **Leksiarxeio answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅

