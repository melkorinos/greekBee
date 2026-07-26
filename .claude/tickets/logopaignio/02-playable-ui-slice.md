# 02 — Playable UI slice

**Source spec:** `.claude/handoffs/logopaignio.md`

**What to build:** A person can open `/logopaignio`, see a heavily blurred company mark, type a guess, watch the mark de-blur one step on each wrong guess, solve it or give up, see the result, and have their score posted to the leaderboard — all on the placeholder puzzle from ticket 01. Still `wip:true`.

**Blocked by:** 01 — Foundation & pure game logic.

**Status:** ready-for-agent

- [ ] `LogoReveal` shows the mark blurred via CSS `filter: blur()`, stepping toward clear one level per wrong guess; framed with the shared `FramedMedia` frame.
- [ ] Free typed-text input primitive — **no autocomplete, no multiple choice** — reusing the play-surface input recipe; commits on Enter and on an explicit button.
- [ ] Sector shown as a permanent free hint (e.g. «Σούπερ μάρκετ»).
- [ ] Give-up path with confirm; result/reveal screen shows score + the answer; the answer/logo never appears in the share preview.
- [ ] Board wired to the reducer + live score post + round persistence (guesses + puzzleId saved → RESTORE replay survives reload).
- [ ] HowToPlay includes the legal/attribution line; leaderboard row present.
- [ ] Game appears in the sidebar (`Shell.tsx GAME_IDS`) and the home trophy button (`HomeTrophyButton` branch) — not only behind the flag.
- [ ] Semantic tokens + recipes only (theming guards pass); per-game accent rows for `[data-game="logopaignio"]`, all surfaces.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.
