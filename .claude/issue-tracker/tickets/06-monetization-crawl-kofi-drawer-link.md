# Monetization crawl: create the Ko-fi account and ship the drawer link

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:task`
**Status:** ready-for-human
**Assignee:** _(unclaimed)_

## Question

Get a real support URL into `platform.ts` and a «Στήριξε το παιχνίδι» link into the Shell
drawer — the entire "crawl" step from `.claude/handoffs/HANDOFF-monetization.md`.

**This ticket carries its own build**, under the map's Notes exception: the decision was fully
made in the 2026-07-15 grill, and the consequence is a config constant plus a drawer link. The
grill's locked decisions are **not to be re-litigated** — read the handoff's decision table
before touching anything.

### Human half (blocking, operator only)

1. **Create the Ko-fi account** (or confirm a different platform — the code is identical either
   way, since the handoff mandates abstracting behind a swappable config constant). Hand back
   the URL.
2. **Get an accountant's read.** The handoff flags this as a real prerequisite: even tiny
   personal income is declarable in Greece. This is a real-world task, not a code task, and it
   gates *receiving* money — not shipping the link. Decide explicitly whether the link ships
   before the accountant answers or after.
3. Confirm the payout stays **personal/individual** — the handoff is emphatic: do not
   incorporate for a cost-recovery-scale hobby project.

### Agent half (once the URL exists)

1. `SUPPORT_URL` constant in `src/config/platform.ts` — never hardcoded elsewhere (standing
   rule).
2. «Στήριξε το παιχνίδι» link in the **Shell drawer**, next to the existing Βοήθεια/Feedback
   entry, in the Κοινότητα section. External `<a target="_blank" rel="noopener">`.
3. Copy tone: honest server-cost framing («Οι διακομιστές κοστίζουν… αν σου αρέσει, στήριξέ
   το»). **No guilt, no mission-grandiosity, no cutesy coffee framing.** Never a modal, never
   naggy — one quiet permanent entry point.
4. Semantic tokens and recipes only — no raw palette, no inline styles (ADR 0008).
5. Post-feature protocol: a render/interaction test for the drawer link, then
   `npm run test -- --run`, `npx eslint .`, `npm run build` all green. The drawer is shared
   chrome, so **`npm run test:e2e` is required** before calling the branch ready.
6. Add the **"Support"** glossary term to `CONTEXT.md` — external donation link, not persisted,
   distinct from Feedback and Nomination. The handoff says to add it *when built*, not before.

### Do not

Build the `/support` transparency page, the sponsor slot, ads, memberships, or a supporter
badge. No DB tables, no webhooks, no money↔DeviceId linkage — external-only is the decision
that keeps the anonymous identity model untouched. Those levers are **out of scope** on the map.

**Why this is on the launch path at all:** traffic costs money, and the operator's whole ethos
is that the platform pays for its own servers. The link is more useful the day traffic
arrives than a month later.
