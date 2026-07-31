# Offline Lock: is it still in, and where does lock state live?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:grilling`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_
**Blocked by:** [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md)

## Question

Two decisions, in order:

**1. Does Offline Lock ship before launch?** The operator kept it in scope on 2026-07-31, but
the design is from 2026-06-29 and nothing has been built. Leksokipos works fine without it.
This is blocked on the launch checklist because the checklist is what says whether a
nice-to-have Leksokipos feature belongs on the launch path — reconfirm or drop it there.

**2. If it ships: how does the Shell read the lock?** This is the one genuinely open design
question the handoff left unresolved. Everything else in
`.claude/handoffs/offlineFeature-handoff.md` is **settled and must not be re-litigated** —
the outbox shape, the flush-on-toggle-off behaviour, the mount-time safety net, the
no-online-notification call, Daily-Puzzles-only.

The toggle lives in Leksokipos, but the Shell needs lock state to intercept its nav links. The
handoff names two valid options and declines to pick:

| Option | For | Against |
|---|---|---|
| React context at Shell layout level | Idiomatic React; Leksokipos writes `setLocked`, Shell reads `isLocked` | Adds a provider to the global layout — every page pays for one game's feature |
| `localStorage` flag + `storage` event | No global provider | `storage` events do not fire in the originating tab, so same-tab updates need a manual path |

Weigh it against the standing rule that **each game reads/writes only its own `useGameStore`
slice** and never touches `localStorage` directly — the localStorage option needs an explicit
answer for how it does not violate that, or an explicit exception.

Also settle the **toggle placement** inside the Leksokipos UI, which the handoff deliberately
deferred to implementation time with the note *"don't cramp the UI"*.

### Context the resolver needs

- `src/hooks/useScoreSubmission.ts` — must be **bypassed** during lock; the flush calls
  `postScore` directly, dodging the in-memory `lastPostedRef` dedup guard
- `src/games/leksokipos/hooks/useDayChange.ts` — must skip `router.replace` while locked and
  show the banner instead. Puzzle rotates at **03:00**, not midnight
- ADR 0010 records the no-service-worker decision; cold start is unsupported **by design**
- `CONTEXT.md` already mints the `Offline Lock` and `Offline Score Outbox` terms

**Resolution shape:** a go/no-go plus, if go, the state-sharing verdict and toggle placement —
then hand to `/to-tickets` + `/tdd` for the build, starting from the outbox flush logic.
