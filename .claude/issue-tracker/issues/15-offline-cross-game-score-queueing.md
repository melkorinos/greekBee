# Offline scores are queued for Leksokipos only — the other seven games lose them

Status: ready-for-agent

**UNBLOCKED 2026-08-03** — Offline Mode shipped (ADR 0010). This is now pickable.

**Scope correction:** the offline set is **six** games, not eight — `stavrolekso` and
`leksikastirio` are excluded (server-backed community surfaces, see ADR 0010), and `leksindeseis`
is `wip:true`. So the games that lose an offline score are Leksiarxeio, Vres Tin Frasi,
Leksodromia, Leksoplegma, and Topothesies.

## What's deferred

Offline Mode makes all eight finished games **playable** without a connection, but only
**Leksokipos** scores are written to the Offline Score Outbox and synced on deactivate. A score
earned offline in Leksodromia, Leksoplegma, Topothesies, Leksiarxeio, Vres Tin Frasi, Stavrolekso,
or Leksikastirio is **silently lost** when the round ends.

Deliberate scope call by the operator on 2026-08-03: the goal was offline *playability* everywhere,
with score integrity guaranteed for Leksokipos only, to keep the first pass shippable.

## Why this is cheap to pick up later

The outbox is **already keyed by `(gameId, puzzleDate)`** rather than being a single global entry,
precisely so this work needs no stored-data migration. The storage shape does not change — what
changes is which games write to it.

## Pending work

- [ ] **Wire the remaining finished games' score paths through the outbox.** Note they do not all
      post the same way: the slot-fill family (`useSlotFillRound` — topothesies, leksoplegma, plus
      the wip posokanei/logopaignio) posts **continuously mid-round** via `useLiveScorePost`, while
      the guess family (`useGuessRound` — leksiarxeio, vrestifrasi) scores **once on end**. Leksodromia
      is neither and decays with time. Each family needs its own answer for what "the pending score"
      means offline.
- [ ] **Decide Leksodromia explicitly.** Its score decays against a wall clock. A score earned
      offline and synced an hour later is not obviously the same score — confirm the intended
      semantics before wiring it, rather than assuming the Leksokipos rule transfers.
- [ ] **Extend the flush tests** to cover multiple simultaneous outbox entries (two games played in
      one offline session) — the keyed shape supports it but nothing exercises it today.

## Why it's an issue, not a handoff thread

The Offline Mode handoff is scoped to what ships now and says so in one line. This is real,
non-trivial follow-up work with a genuine open design question (Leksodromia's decay), so it needs to
be visible in triage rather than buried as a caveat in a shipped handoff.

## References

- `.claude/handoffs/offlineFeature-handoff.md` §4 — the outbox design and the Leksokipos-only limit.
- `docs/adr/0010-offline-lock-client-side-no-service-worker.md` — the 2026-08-03 amendment.
- ADR 0019 — the two round spines, which is why "wire the rest" is not one uniform change.
