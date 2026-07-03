# Profile entry points: Shell header icon, home chip, ProfileSection funnel link

Status: ready-for-agent

## Parent

`.claude/handoffs/profilePageAndAchievements.md` (§2 Entry points, §5 slice 2, decision 12).

## What to build

Three discoverable funnels into `/profile`, so anonymous players get nudged toward the page (and Google sign-in) from wherever they are.

- **Shell header icon** (primary): an always-visible 👤 / avatar-disc button next to the hamburger in the `Shell` header, `aria-label="Το προφίλ μου"`, linking to `/profile`. Same round-button style as the theme toggle. This is a header icon, **not** a drawer entry (decision 12 — "both" was declined).
- **Home-picker chip**: a small profile chip on the home page header — shows the display name when linked, "Σύνδεση" otherwise. The home page is a server component today, so the chip must be a small client island.
- **ProfileSection funnel link**: a "Δες το προφίλ σου →" link inside `ProfileSection` so the leaderboard modal funnels players to the page. The modal keeps its own compact widget (mid-game sign-in) untouched.

## Acceptance criteria

- [ ] Shell header shows an always-visible profile button next to the hamburger with `aria-label="Το προφίλ μου"`, navigating to `/profile`.
- [ ] No profile entry is added to the drawer.
- [ ] Home page header shows a client-island chip: display name when linked, "Σύνδεση" when anonymous, linking to `/profile`.
- [ ] `ProfileSection` shows a "Δες το προφίλ σου →" link to `/profile`; the modal's compact widget is otherwise unchanged.
- [ ] Greek-only strings; Tailwind tokens only; button matches the existing 36px round-button style.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.

## Blocked by

- `02-profile-route-identity-header-restore-redirect` (the route must exist to link to).
