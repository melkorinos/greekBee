# ADR 0025 — Round End, the Result Panel, and what a shared summary carries

**Status:** accepted (2026-08-17) · **not built** — the work is [TICKET-15](../../.claude/tracker/tickets/TICKET-15-round-end-result-panel-launch.md)
**Supersedes nothing.** Extends `ShareResultPanel`, which shipped for Τοποθεσίες and the two hidden slot-fill Games.

## Context

Seven Games are live and **one of them ends with a share**: Τοποθεσίες, through
`src/components/shared/ShareResultPanel.tsx`. Πόσο κάνει; and Λογοπαίγνιο use the same panel and are
both `hidden` (ADR 0022), so the panel has one visible consumer.

The other live Games end in four different ways and none of them offers a share:

- Λεξοδρομία and Λεξόπλεγμα already build a full recap — score plus per-word detail — with no share
  button on either.
- Λεξιαρχείο and Βρες τη Φράση end with a one-line `FeedbackBanner` and nothing else.
- Λεξόκηπος has **no terminal state at all.** `isEndgame` fires at top rank and «ΤΟ ΠΕΘΑΝΕΣ» at full
  completion, but a normal player simply stops. Its existing header `ShareButton` shares the *puzzle
  URL*, not a result.

Two further facts set the shape of the decision. First, **no share text anywhere carries a link, a
date, or the Platform's name** — all three existing builders emit emoji plus `Σκορ: N`, so a summary
pasted into a chat is untraceable back to the site. Second, **nothing on the Platform uses
`navigator.share`**; every share is a clipboard copy, on a Platform whose audience is Greek and
mobile, where Viber and Messenger were already named as the targets that matter (`TICKET-10`).

`TICKET-10` shipped `opengraph-image` the day before this decision. That card exists so a posted link
renders as something; until links are actually posted, it renders for nobody. The two are the same
bet.

The Platform also had **five different names for "the round is over"** — `status: "won"/"lost"`,
`stage: "finished"`, `isFinished`, `gaveUp`, `isEndgame` — and no glossary entry for the concept.
This is the first feature that needs one concept spanning six Games, which is why the vocabulary is
part of the decision rather than a side effect of it.

## Decision

### The vocabulary

**Round End** is the per-Game moment at which a Session becomes summarisable. It is deliberately
**not** one rule: each Game names its own, and the list is closed.

| Game | Round End |
|---|---|
| Λεξιαρχείο | all five Lengths **resolved** — won or lost, not won |
| Βρες τη Φράση | `status` leaves `playing` (won or lost) |
| Λεξοδρομία | all ten words resolved (solved or finally skipped) |
| Λεξόπλεγμα | every Required Word found |
| Τοποθεσίες | `stage: "finished"`, including give-up |
| Λεξόκηπος | **top Rank reached on a Daily Puzzle** — see below |

**Result Panel** is the surface Round End renders: score, the Game's own summary row, the share
action, the Leaderboard link. It is `ShareResultPanel`, widened.

The text that leaves the app keeps its existing code name, `shareText`. A third term was considered
and rejected: coining one the code contradicts is how a glossary starts lying.

### It is not a capability

Sharing writes nothing to the shared database, so by ADR 0020's own criterion it is **presentation,
which derives** — not behaviour, which enrols. No new field on `GameRegistryRow`, no new
`GameCapability`. This is the same ruling Sound Cues got (ADR 0021) for the same reason. Which Games
have a Result Panel is a structural fact about the Game, readable from whether it renders one.

### Λεξόκηπος is the one Game that pops

Every other Game reaches Round End at a moment where play has stopped, so its Result Panel renders
**inline**, below the board, with no modal. An auto-opening modal was rejected: three of the six
already render their result in-page, so a modal means dismissing a box to see your own recap
underneath.

Λεξόκηπος has no such moment. Its Round End is reaching the top Rank — `isEndgame`, which already
exists in `GameBoard` and already has a seen-once cue in `ScoreBar` — and play *continues* past it.
So Λεξόκηπος alone gets a **pop**, dismissible, fired once per Daily Puzzle. Two consequences:

- **The shared score is live, not a snapshot.** A player who shares an hour later shares the higher
  number. A snapshot would be stale in the message it was pasted into.
- **Its header `ShareButton` becomes the result share** and is how a player gets back to the panel
  after dismissing the pop. URL-sharing survives on Custom Puzzles, where sharing the board *is* the
  point.

### A lost round shares

The panel is identical on a loss. Wordle's `X/6` is posted as often as a win, and a summary that only
appears when the player is winning reads as bragging rather than playing.

### What the shared text carries

Four lines, every Game, every time:

```
Leksiarxeio 17/08          Vres Tin Frasi 17/08       Leksodromia 17/08
🟩🟩⬛🟩🟩                   ⬛⬛🟩                       ✅✅✅⏭️✅✅✅✅⏭️✅
Σκορ: 17                   Σκορ: 4                    Σκορ: 720
https://…/leksiarxeio      https://…/vres-tin-frasi   https://…/leksodromia

Leksoplegma 17/08          Leksokipos 17/08           Topothesies 17/08
🟩🟩🟩🟩🟩🟩🟩🟩🟩 +4          🌸 Απολυτότητα              🗺️ ⬛↗ ⬛→ 🟩
Σκορ: 640                  Σκορ: 187                  🏛️ ⬛ 🟩
https://…/leksoplegma      https://…/leksokipos       Σκορ: 4
                                                      https://…/topothesies
```

Six rulings inside that, each with a rejected alternative:

1. **A link, and it carries no date.** All five non-Λεξόκηπος routes accept `?puzzle=<date>`, so a
   dated deep link was available and was rejected: it is right for the hour it is posted and wrong
   forever after, because group chats resurface and someone tapping in October would land on an
   August board. The bare route always serves today, keeping the shared score comparable to what the
   recipient is about to play.
2. **The identity line is the Game's Greeklish name and the date — no Platform name.**
   `Leksarxeia · Leksiarxeio` puts two names one letter apart side by side, and the operator
   demonstrated the collision by making it mid-grill. The link and its og:card carry the brand.
3. **Raw score, no maximum and no Leaderboard position.** A position is a moving number that is wrong
   minutes after it is pasted, and it would cost a fetch at every Round End.
4. **One line per Game, one emoji per unit** — a Length, a guess, a word, a Required Word. A
   letter-level grid was rejected for Βρες τη Φράση, whose phrase runs up to nine words of eight
   letters and is unreadable in a chat bubble.
5. **Τοποθεσίες keeps its two rows and its direction arrows** as the one deliberate exception. The
   arrows carry information no other Game has an equivalent of, and its share text is the only one
   already live and tested.
6. **Spoiler-free stays a hard constraint**, unchanged from the three existing builders: no word, no
   phrase, no answer, no brand, no price, no place name. The existing recaps *do* name words — they
   stay on screen and never enter the text.

Names and titles are read from `PLATFORM_NAME` and the registry's `title` fields. No literal Game
name is typed anywhere in this feature.

### The existing recaps fold in

`RoundRecap` (Λεξοδρομία) and `LeksoplegmaRecap` both open with their own score heading. They become
the Result Panel's `children` and drop those headings, so the score is printed once per screen.

## Consequences

**Accepted knowingly, with the number on the table: 20% of Λεξιαρχείο player-days will show a Result
Panel.** Measured 2026-08-17 against the live database — of 35 Λεξιαρχείο player-days, resolved-length
counts were 1:10, 2:7, 3:10, 4:1, **5:7**. The alternative (panel on the first resolved Length,
updating as more resolve) was offered with that measurement and declined: a partial Λεξιαρχείο day is
genuinely unfinished, and the Leaderboard Score already sums all five. The sample is small and is
beta data that `launch-reset.sql` wipes, so **re-measure after launch before treating 20% as the
steady state.**

**`navigator.share` is browser behaviour, so a unit test cannot prove it.** The pattern is
feature-detect, call, fall back to clipboard. Per the standing rule in `reflections.md` — a mock is a
claim about someone else's contract — the fallback path is the one a unit test can hold, and the
native path needs one real-browser check. Note the shape of the risk: `router.prefetch` returning
`void` and jsdom's `HTMLMediaElement.play()` returning `undefined` have both already cost this repo a
shipped bug. `navigator.share` returns a real Promise that **rejects on user cancel**, which must not
surface as an error to the player.

**Λεξόκηπος's pop is the only new interruption on the Platform**, and it fires at the most satisfying
moment in the Game. If it reads as intrusive, the fix is to remove the pop and keep the header button,
which is a smaller change than adding it.

**No new table, no new column, no migration.** Nothing about this feature writes to the database.

**If sharing does not move anything, `TICKET-10`'s card was the sunk cost, not this.** The card only
ever pays off through posted links; this is what posts them.

## Rejected

- **A `share` GameCapability or a registry flag** — presentation derives (ADR 0020).
- **An auto-opening modal for every Game** — three already render their result in-page.
- **A streak or cross-Game line in the summary** — the ask was a *brief* summary, and Streak is
  defined in `CONTEXT.md` but surfaced nowhere yet; adding it here would ship it by the back door.
- **A dated deep link**, **a Leaderboard position**, and **a per-length letter grid** — reasons above.
- **Λεξόκηπος getting an invented terminal state** so it could match the other five. Reaching top
  Rank is a real moment in that Game; ending it artificially is not.
