# Handoff: Λογοπαίγνιο (Logopaignio) — guess the Greek company from its logo

**Date:** 2026-07-26
**Status:** Design pinned via `/grill-with-docs` — no code yet. Ready for `/to-tickets` → `/tdd`.
**Goal:** New daily game. Player is shown a Greek company's **logo mark with the wordmark stripped out**, and types the brand name letter-for-letter. Same daily-puzzle + emoji-share shell as Πόσο κάνει; and Topothesies.

The name is a deliberate pun: **λογοπαίγνιο** = "wordplay/pun", and it literally contains **logo**.

---

## Concept in one line

A blurred, name-stripped company **mark** is revealed step-by-step; you type the brand name (exact spelling, normalized); fewer reveals = more points; share a spoiler-free emoji row.

---

## Locked decisions (do not re-litigate — settled in the grill)

| # | Decision |
|---|----------|
| **Content filter** | **Icon/mark logos only.** If a brand's logo *is* just its name in a typeface (pure wordmark — Σκλαβενίτης, Jumbo, ΟΠΑΠ-style), **skip the brand entirely.** The game only works on logos with a recognizable non-text mark. |
| **Strip the text** | Present **only the mark**, wordmark removed. Source the brand's mark-only asset (app icon / favicon / brand-kit "symbol"); manually crop/erase only as fallback. Never edit so much it becomes a redraw (Q4 says we use official logos as-is). |
| **Input** | **Free typed text, no autocomplete, no multiple choice.** Player writes the brand name letter-for-letter. |
| **Matching** | **Normalized**, not literal: case-insensitive, accent-insensitive, whitespace-trimmed (reuse `normalizeLetters()` posture — see CLAUDE.md "No Greek accents"). **Plus a small per-brand accept-list** covering the Greek⇄Latin fork (`Cosmote`/`Κοσμοτε` both win). Pure character-exact was rejected — it reads as "buggy" to a player who clearly knew the brand. |
| **Format** | **One puzzle/day**, `dateToIndex` rotation (clone `selectDailyPuzzle` from posokanei/topothesies — exact `date` match else rotation, one row always renders). |
| **Progression** | **Progressive reveal:** logo starts heavily blurred; each wrong guess de-blurs one step. **5–6 guesses.** Points decay per reveal step. **Sector shown as a permanent free hint** (e.g. «Σούπερ μάρκετ») to offset exact-spelling harshness. |
| **Scoring** | **Clone the `POSOKANEI` scoring shape** — full points on a first-guess (fully-blurred) solve, decay per reveal step, **0 on give-up**. Reuses leaderboard plumbing. |
| **Share grid** | Spoiler-free guess-row: `🟦🟦🟩⬜⬜` (blue = wrong/revealing, green = solved, white = unused) + score + date. **Never** render the logo or the name in the share text. |
| **Legal** | **Ship with official logos.** No open-data / own-photo escape hatch exists (unlike ODbL boundaries or self-shot price photos) — every hosted logo is someone's trademark/copyright. Accepted consciously as a hobby-game risk. **Mitigation: documented risk note + a fast takedown path.** This is the one thing that could kill the game post-launch. |
| **Scope of "Greek"** | Founded/HQ'd in Greece **and** recognizable to a general Greek audience. Excludes obscure B2B and foreign brands. |
| **Rebrands** | **Current logo only** — avoids "that's the old one" disputes. |
| **Foreign-owned** | **Allowed if still perceived as Greek** (e.g. Goody's, Chipita-era brands). |
| **Defunct** | **Included** (Olympic Airways, retired ΟΤΕ marks, etc.) — nostalgia is a feature here, and it helps hit the 150–200 pool. |
| **Sub-brands** | **Master/parent brand only** — no product-line logos. |
| **Name / id** | UI title **«Λογοπαίγνιο»**; id `logopaignio`; route `/logopaignio`. |
| **Launch pool** | **~30 to ship a wip build; 150–200 for a proper launch** that won't repeat for months. |

---

## The two hard problems (everything else is routine platform work)

1. **Matching, not sourcing.** "Letter-for-letter" on bilingual brand names is the real engineering risk. The answer is the per-brand accept-list + normalization above. Every puzzle row needs a curated `accept: string[]` (Greek form, Latin form, common variants). Budget curation time here, not on finding companies.
2. **Legal.** Logos are IP with no clean license story. Decision is to ship anyway with a takedown path — but write the risk note into `CONTEXT.md`/an ADR when the game graduates from wip, so future-you remembers it was a conscious call.

---

## Implementation plan (vertical slices — mirror posokanei/topothesies exactly)

The platform already has the whole daily-game skeleton. This is mostly *filling in the same slots*, not new architecture.

1. **Config** — register in `src/config/games.ts` (`GAME_REGISTRY`, `RegistryGameId`, emoji e.g. 🔎/🏷️). Add a `LOGOPAIGNIO` block to `src/config/gameRules.ts`: `MAX_GUESSES` (5–6), `POINTS_PER_GUESS_LEFT`, `BLUR_STEPS`, blur radii per step. Add any achievement thresholds to `achievementTuning.ts` if it gets achievements.
2. **Types** — `src/games/logopaignio/types.ts`: `LogopaignioPuzzle { id; date?; brand; sector; accept: string[]; markAsset; credit? }`, `LogopaignioGuessRecord`, round state. Add a persistence slice to `SliceId` in `src/types/index.ts` if it stores progress.
3. **Pure logic** — `src/games/logopaignio/lib/` (zero React):
   - `selectDailyPuzzle` — copy posokanei's exact-date-else-`dateToIndex`.
   - `evaluateGuess(input, puzzle)` → `{ correct, normalizedInput }` using `normalizeLetters()` + accept-list membership.
   - `scoring` — clone `POSOKANEI` decay shape.
   - `logopaignioReducer` — **flags DERIVED from guess history → RESTORE = replay** (same pattern as topothesies/posokanei; invalid/empty guesses no-op; give-up = `GIVE_UP` action + `gaveUp` flag).
   - `shareText` — spoiler-free guess-row grid.
4. **Store slice** — its own `useGameStore` slice; never touch `localStorage` directly.
5. **Hooks** — reuse `useLiveScorePost`, `useRoundPersistence`, `useLeaderboard`, `useDayChange`. Add a thin `useLogopaignioRound` (saves guesses + puzzleId → RESTORE replay), like `useTopothesiesRound`.
6. **Components** — `GamePageShell` + `GameHeader`, `max-w-game`. Reuse **`FramedMedia`** for the logo frame (already shared, used by topothesies + posokanei). New: `LogoReveal` (blur via CSS `filter: blur()` stepping down per reveal — no image editing needed for the blur itself), a plain typed-text input primitive (mirror `PriceInput`'s "local primitive reusing the play-surface input look" pattern), board, result/reveal, HowToPlay with the **legal attribution/credit line**, leaderboard row. **Add `logopaignio` to `Shell.tsx GAME_IDS` and the `HomeTrophyButton` branch in `page.tsx`** (topothesies got missed here — flag flip alone won't show it in the sidebar).
7. **Data** — `src/data/logopaignio/puzzles-el.json` (or per-brand rows) + the mark assets. Ship `wip:true` on a placeholder puzzle first, exactly like posokanei did.
8. **Styling** — semantic tokens only, recipes for buttons/inputs, per-game accent via `[data-game="logopaignio"]` rows (ADR 0008/0009). No raw palette classes.

**Blur is free.** The reveal is a CSS `filter: blur()` that steps toward 0 — no pre-blurred image variants needed. The only image work is the one-time **wordmark strip** per brand.

---

## Content pipeline (the actual grind)

**A. Build the brand list (hand-curated — Q7).** The binding constraint is the icon-only + recognizable filter, which is manual; a scrape mostly adds pruning. Seed list below.

**B. Per brand, produce the mark asset (Q8):**
1. Find the brand's **mark-only** version first — app icon, favicon (`/favicon.svg`), press/brand kit "symbol" download. Often already square and clean.
2. If only a combined icon+wordmark exists, **crop/erase just the text**.
3. If it's a pure wordmark with no separable mark → **drop the brand** (Q1).
4. Store a `credit`/source per asset for the takedown-readiness note.

**C. Per brand, write the accept-list (the matching curation):** canonical display name + every legit spelling (Greek, Latin, common variants). This is where puzzle-authoring time actually goes.

---

## Seed candidate list (verify each has a separable non-text mark before including)

Organized by sector. **Not confirmed against the icon-only filter** — each needs step B1 verification; some may drop as wordmark-only.

- **Supermarkets:** ΑΒ Βασιλόπουλος (AB mark), My Market / Metro, Κρητικός, Γαλαξίας, Bazaar, Μασούτης, Χαλκιάδης.
- **Airlines / ferries:** Aegean Airlines (bird), Olympic Air / **Olympic Airways** (defunct — meander rings), Sky Express, Blue Star Ferries (star), Superfast Ferries, ANEK Lines, Minoan Lines, Hellenic Seaways, SeaJets, Attica Group.
- **Telecom / internet:** Cosmote, OTE (ΟΤΕ), Nova, WIND (defunct/merged), Forthnet.
- **Banks / finance:** Εθνική Τράπεζα, Τράπεζα Πειραιώς, Alpha Bank, Eurobank, Optima Bank, Attica Bank, Εθνική Ασφαλιστική, Interamerican.
- **Energy / fuel:** ΔΕΗ (PPC), ΕΚΟ (EKO — flame), Helleniq Energy / ΕΛΠΕ, Shell Hellas (skip if foreign-perceived), Coral, Avin, Jetoil, Aegean Oil.
- **Food / beverage / dairy:** ΔΕΛΤΑ, ΝΟΥΝΟΥ (mascot), Μέβγαλ, Όλυμπος, ΦΑΓΕ, Vikos, Λουξ (Loux), ΕΨΑ, Ήβη, 3E/Coca-Cola (skip foreign), Chipita / 7Days / Molto, Παπαδοπούλου, ΙΟΝ, Misko, Μέλισσα, Barba Stathis (Μπάρμπα Στάθης).
- **Fast food / cafe:** Goody's, Everest, Γρηγόρης, Coffee Island, Mikel, Flocafe.
- **Retail / electronics:** Public, Kotsovolos, Πλαίσιο, Media Markt (skip if foreign), Praktiker, Leroy Merlin (skip foreign), Hondos Center, Jumbo (likely wordmark → verify).
- **Online / delivery:** Skroutz (bag mark), e-food (efood), BOX, Wolt (skip foreign), Car.gr, Spitogatos, XE.gr.
- **Betting / lottery:** ΟΠΑΠ, Stoiximan, Novibet, Pamestoixima.
- **Cosmetics / pharma:** Korres, Apivita, Frezyderm, Sarantis, Papoutsanis, Sesderma (skip foreign).
- **Industry / construction:** ΤΙΤΑΝ (Titan), Μυτιληναίος / Metlen, ΓΕΚ ΤΕΡΝΑ, Aktor, Alumil, ΕΛΒΑΛ.
- **Utilities / transport:** ΕΥΔΑΠ, ΕΥΑΘ, Hellenic Train / ΟΣΕ, ΣΤΑΣΥ, ΟΑΣΑ.

**Excluded for v1:** sports clubs (Olympiacos/ΠΑΟ etc. — clubs, not companies; possible later expansion pack), foreign brands merely popular in Greece.

Rough survivable count after the icon-only filter is realistically **~80–130** from this seed — enough to launch (150–200 target) once you add the long tail and defunct/nostalgia marks.

---

## Risks / watch-items

- **Legal (highest).** Trademark/copyright on every asset. Ship-anyway is the decision, but keep a takedown path and the risk note. Reassess if the game gets real traffic.
- **Pool reachability.** 150–200 icon-only *and* recognizable brands is ambitious; including defunct/nostalgia marks (decided) is what makes it reachable. If it stalls, relax "recognizable" before relaxing "icon-only" (relaxing icon-only breaks the game).
- **Matching complaints.** Even with normalization + accept-lists, expect "I knew it but it said wrong" reports. Mitigate by generous accept-lists and, if needed later, a post-solve "we also accept: …" line.
- **Blur difficulty tuning.** First-step blur must be hard-but-fair. Tune `BLUR_STEPS`/radii as a `gameRules` knob so it's adjustable without code changes.

---

## Recommended next actions

1. `/to-tickets` — break this into vertical-slice tickets (config+types, pure lib+tests, slice+hooks, UI, first 30-puzzle content batch, legal note).
2. `/tdd` — start with the pure `lib/` (`evaluateGuess` matching + `scoring` + reducer replay), red-green before any UI.
3. Content: curate the first **30** brands (mark asset + accept-list) to get a wip build live, mirroring how posokanei shipped on one placeholder.
