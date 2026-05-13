# Agent Reflections — Greek Word Games Platform

## ⚠️ Active Tensions (watch these)

### Connections puzzle freshness
Only one seed puzzle exists. Operator must manually add new dated entries to `puzzles-connections.json`. No reminder system exists. Add a cron check or at minimum document the procedure clearly before going to production.

### Connections "one away" UX gap
The reducer detects "one away" and sets feedback text, but `GroupGrid` has no visual highlight indicating _which_ group the player is close to. NYT shows colour intensity. Consider adding in Phase 4 polish.

### Custom URL word count warning
The `/spelling-bee/[center]/[outer]` route shows a banner if `validWords.length < 5`, but there is no lower bound that triggers a 404 — a player can construct a URL that yields 0 valid words. The UX is honest (warning banner), but consider whether to 404 on 0-word combos instead.

### Greek letters in URLs
Modern messaging apps (WhatsApp, Telegram, iMessage) and all mainstream browsers handle Greek path segments correctly via IRI/percent-encoding. Edge risk: some old email clients or corporate proxies may mangle `%CE%B1`-style sequences. Acceptable for the current use case; document if a user reports it.

### `puzzles-el.json` file size
At ~5 MB the file is large because each puzzle stores its full `validWords` array. Now that `buildCustomPuzzle` computes words dynamically from `words-el.json`, the same approach could be applied to curated puzzles — storing only `centerLetter + outerLetters + date` and computing `validWords` at request time. This would shrink the file to ~50 KB. Do this as an explicit tech debt task, not opportunistically.

### Mobile input path for Wordle
`window.keydown` works on desktop. The on-screen Keyboard component handles mobile. There is no test verifying the on-screen keyboard dispatches correctly end-to-end.

---

## ✅ Resolved Tensions (archive)

- **`dark:` Tailwind classes** — removed in Phase 2.5; theme lives at `<main>` root unconditionally ✅
- **`FeedbackBanner` graduation** — triggered by Connections needing it; graduated cleanly with `theme` prop ✅
- **`normalizeLetters` cross-game utility** — stays in `src/games/spelling-bee/lib/normalize.ts` for now; Wordle GR imports it directly. Graduate to `src/lib/normalize.ts` when a third game needs it ✅ (tracked)
- **Wordle answer pool quality** — `answers-5.json` curated subset created; obscure words excluded ✅

