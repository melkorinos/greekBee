# HANDOFF — Monetization (cover server costs, not profit)

> Source: `/grill-with-docs` session, 2026-07-15. This is a **plan**, not implemented code.
> Ethos: the platform should pay for its own servers. Hobby project, not a business.
>
> **Status 2026-08-06: off the launch path.** The monetization crawl was dropped from the launch
> plan by operator call — nothing here blocks a go/no-go. The plan stays whole and
> resumable; the locked decisions below are still not to be re-litigated when it is picked up.

---

## TL;DR

Ship a **quiet external donation link** and nothing else, first. Everything heavier
(transparency page, sponsor slot, ethical ads, memberships) is documented as a later
lever but explicitly **not** in the first step. External-only means **zero changes to the
anonymous identity model** and no new DB tables.

---

## Locked decisions (from the grill)

| Dimension | Decision | Consequence |
|---|---|---|
| **Cost target** | Just today's real bill, ~$20–45/mo (Vercel Pro base + Supabase). | No subscriptions, no VAT machinery. **Moving target** if users keep growing. |
| **Posture** | Brainstorm — keep the full menu alive, don't lock one mechanism. | Handoff is a menu with a recommended sequence, not a single build. |
| **Ads** | Ethical/contextual only — no Google/surveillance ads. | See eligibility flag below; realistic "ad" may be a self-filled slot. |
| **Payout** | Personal/individual, keep it tiny. | Declare income, **do not incorporate**. Constrains to platforms paying individuals. |
| **Effort** | External-only, near-zero code. | No money↔DeviceId linkage, no webhooks, no new tables. |
| **Placement** | One quiet, permanent «Στήριξε το παιχνίδι» entry point in the Shell drawer. | Never a modal, never naggy. Sits next to existing Βοήθεια/Feedback entry. |
| **Platform** | Abstract behind a swappable config constant. **Ko-fi** is the named default. | Code identical whichever platform; pick/confirm before wiring. |
| **Support page** | Deferred to "walk" — not in the first step. | Crawl ships only the drawer link. |
| **Ask tone** | Honest server-cost framing («Οι διακομιστές κοστίζουν… αν σου αρέσει, στήριξέ το»). | No guilt, no mission-grandiosity, no cutesy coffee framing. |
| **Sponsor/house slot** | **Unsettled idea**, kept on the menu — not committed. | Do not build without another decision. |

---

## Recommended sequencing

### Crawl — build this first (near-zero code)

**Why it is worth doing at all:** traffic costs money, and the operator's ethos is that the
platform pays for its own servers. The link is more useful the day traffic arrives than a
month later — which is the argument for building it near a launch, not long after one.

**Human half, operator only:** create the Ko-fi account (or confirm a different platform —
the code is identical either way) and hand back the URL; confirm the payout stays
personal/individual; see the tax flag below.

1. Add a `SUPPORT_URL` constant to `src/config/platform.ts` (single-source rule — CLAUDE.md).
   Default it to a Ko-fi URL (to be created/confirmed by the operator).
2. Add a «Στήριξε το παιχνίδι» link in the **Shell drawer**, in the **Κοινότητα section**
   next to the existing Βοήθεια/Feedback entry point (see `Shell` component). External
   `<a target="_blank" rel="noopener">`.
3. Copy tone: honest server-cost framing. Use semantic tokens/recipes — no raw palette,
   no inline styles (ADR 0008 + CLAUDE.md standing rules).
4. Post-feature protocol still applies: a small render/interaction test for the drawer
   link (it's UI), then `npm run test -- --run` / `npx eslint .` / `npm run build` green.
   The drawer is shared chrome, so **`npm run test:e2e` is also required** before calling
   the branch ready.
5. Likely a light CONTEXT.md glossary term **"Support"** when built (external donation
   link; not persisted; distinct from Feedback and Nomination).

### Walk — only if the bare link underperforms
- `/support` (στήριξε) **transparency page**: honest "here's what it costs to run" +
  the same link. More compelling ask.
- A single **house/sponsor slot** (unsettled — needs an explicit go decision).
- **Cosmetic supporter badge**, granted *manually* (leans on existing Badge/Trophy Case
  infra; still no automated payment→device linkage). Cosmetic only — never pay-to-win,
  leaderboards stay clean.

### Run — only if it must self-sustain at real scale
- Ethical-ad network **if eligible** (see flag), or
- Daily-puzzle **sponsorship** outreach (sales work), or
- Recurring **memberships** (Ko-fi supports these) — this is the first option that would
  justify real identity integration (payment webhook → DeviceId → auto-unlock). Spell out
  that cost before committing; it breaks the "external-only" simplicity.

---

## Open flags — carry these, don't bury them

1. **Tax (prerequisite).** Even tiny personal income is declarable in Greece. Get an
   accountant's read before any real inflow. This is a real-world task, not a code task.
   It gates *receiving* money, not shipping the link — so whoever picks this up must decide
   explicitly whether the drawer link ships before the accountant answers or after.
2. **Ethical-ad eligibility is unverified.** EthicalAds / Carbon Ads curate for
   developer/tech-doc audiences; a Greek consumer word-game may be rejected. **Research
   item — do not promise a network.** If they reject, the only "non-invasive ad" path is a
   self-filled sponsor slot (itself unsettled).
3. **The target moves.** ~$20–45/mo assumes current Fluid-CPU discipline holds. Revisit
   trigger: when Vercel overage becomes non-trivial ($ gauge climbing past the $20
   included) OR Supabase needs Pro. At that point re-open "walk"/"run" levers.

---

## Domain-doc cross-check (grill-with-docs)

- **No conflict** with any ADR or locked architecture decision.
- **Preserves "DeviceId is a secret credential"** (CONTEXT.md) — external-only means no
  payment linkage, so no new identity surface and no new attack surface.
- `SUPPORT_URL` belongs in `platform.ts` per the config-single-source standing rule.
- Fits the drawer's existing Παιχνίδια/Κοινότητα split next to Βοήθεια/Feedback.
- Consistent with `soul.md`'s Vercel-cost-consciousness — this is the funding side of the
  same coin.
- CONTEXT.md glossary gets a "Support" term **when the crawl step is actually built**
  (not before — the handoff is a plan).

---

## Suggested skills for the next session

- **`/tdd`** — for the crawl build (drawer link + `SUPPORT_URL`), test-first per the
  post-feature protocol.
- **`/domain-modeling`** (or `/ubiquitous-language`) — to add the "Support" glossary term
  to CONTEXT.md cleanly when built.
- **`/grill-with-docs`** — re-open if/when the "walk" or "run" levers get seriously
  considered (sponsor slot, memberships, ads), since those carry real trade-offs.

---

## What NOT to do

- Do not build the sponsor slot, ads, memberships, or the /support page in the first pass.
- Do not add DB tables, webhooks, or any money↔DeviceId linkage (violates external-only).
- Do not incorporate or set up a business entity for a cost-recovery-scale project.
- Do not make the ask naggy (no modals, no repeated prompts).
