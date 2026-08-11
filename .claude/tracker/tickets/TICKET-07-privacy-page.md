# A privacy page, in Greek, before strangers arrive

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Legal and privacy"

## Why

The Platform holds personal data and tells nobody. Two kinds:

- **DeviceId** — a UUID in `localStorage`, sent with every Score post and stored against every row
  in `game_scores`, `game_state`, `player_achievements`, `player_milestones` and `player_profiles`.
  `CONTEXT.md` treats it as a **secret credential**: knowing it authorises Score posts and Profile
  access. Pseudonymous, but personal data under GDPR all the same.
- **Email addresses** — Google sign-in puts real addresses in Supabase `auth.users`, linked to a
  device through `player_profiles.auth_user_id`. Not pseudonymous at all.

There is no `/privacy` route, no `/terms`, no cookie or consent surface, and `layout.tsx` sets only
a title and description. The site is already publicly deployed, so this exposure exists today — the
launch does not create it, it just multiplies the number of people it applies to.

**Terms of service are deliberately out of scope.** A free game with no payments, no accounts you
can be locked out of and no user-to-user messaging does not need them, and a copy-pasted terms
document is worse than none. Revisit if money or user-generated public content ever enters.

## Scope

- [ ] A `/privacy` route, **written in Greek**, matching the rest of the UI's voice. Plain language,
      not translated legalese — the audience is Greek players, not regulators.
- [ ] Content, at minimum:
  - Who the controller is and how to reach them (an email address).
  - **What is stored without signing in**: a random device identifier, game progress, scores, and
    an optional display name. Say plainly that no name, email or location is collected.
  - **What changes on Google sign-in**: an email address arrives, held by Supabase, used only to
    restore a player's history on a new device.
  - **Where it lives**: Supabase, hosted in the EU (`eu-central-1`), and Vercel.
  - **How long**: `game_scores` is kept indefinitely as the lifetime-stats substrate; ephemeral
    session data is pruned after `SESSION_RETENTION_DAYS`. Import the constant or state the number
    from `src/config/retention.ts` — do not hardcode a second copy.
  - **How to get it deleted**: the concrete route a player takes. Today the honest answer is "email
    the controller" — say that rather than implying a self-service button that does not exist.
  - **No advertising, no analytics, no third-party tracking, no sale of data.** True today; if
    TICKET-08 lands an error monitor, this line must be revised in the same breath.
- [ ] A link to it from the Shell — reachable from every page. The Shell has no footer today, so
      decide where it goes (drawer is the likely home) and keep it out of the mobile header, which
      is already four buttons wide.
- [ ] Styling per the standing rules: semantic tokens, `max-w-game`, existing recipes. No new
      one-off components if an existing page shell fits.

## Note for whoever picks this up

**This ticket has a dependency on TICKET-08 and it runs the wrong way round.** If error monitoring
is installed after this page ships, the "no third-party tracking" line becomes false and nothing in
the test suite will notice. Either sequence TICKET-08 first, or write this page's third-party
section last and re-read it once TICKET-08 closes.

## Done when

- [ ] `/privacy` renders in Greek, is linked from the Shell, and every claim on it is true of the
      code as deployed — verified by reading the code, not by trusting this ticket.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` clean (this
      adds a route and touches shared chrome).
- [ ] The retention numbers on the page derive from `src/config/retention.ts`.
