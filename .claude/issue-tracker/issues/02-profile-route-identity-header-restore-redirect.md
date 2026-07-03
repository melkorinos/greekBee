# `/profile` route: identity header + welcome banner + restore redirect

Status: ready-for-agent

## Parent

`.claude/handoffs/profilePageAndAchievements.md` (§2, §5 slice 1, §6, decision 9). Parent epic: `.claude/handoffs/engagementEpic.md`.

## What to build

The `/profile` page — a client route wrapped in `Shell` — that becomes the durable home for identity and (later) stats/trophies. This slice ships against the existing `useAuth` / `useProfile` hooks with **no new API**, and doubles as the manual-verification surface for Google sign-in / Sign-in Restore.

End-to-end behavior:

- **Identity header** (new, display-only): initial-letter avatar disc + display name + a status line that reflects the three identity states:
  - AuthLinked → "Συνδεδεμένος με Google ως {authUserName}"
  - ProfileLinked only → "Προφίλ ενεργό: {displayName}" + hint that Google makes it un-losable
  - Anonymous → "Παίζεις ανώνυμα" + sign-in nudge (the actual button lives in `ProfileSection` below)
- **Welcome-back banner**: on mount, if `sessionStorage["signin-restore-welcome"]` is set → show "Καλώς όρισες πίσω{, name}! Τα σκορ σου επαναφέρθηκαν." once, then clear the flag.
- **Account controls**: reuse `ProfileSection` verbatim (all interactive flows), props wired via `useProfile` + `useAuth` + name-save, the same way `HomeTrophyButton` wires it today. `onSignIn` is now a required prop — wire it from `useAuth.signInWithGoogle` (compiler enforces it).
- **Restore redirect**: in the auth callback, when the link response has `restored: true`, `router.replace("/profile")` instead of the saved redirect path (still clear the redirect key). The callback already sets `signin-restore-welcome` and adopts via `adoptDeviceIdentity` — this slice only adds the redirect.

Avatar is the initial-letter disc (first letter of display name, "Α" for Ανώνυμος), pure Tailwind, identical across identity states.

Inherited from the identity epic (do not fight): Disconnect/sign-out full-reset and hard-reload the app via `reloadApp()`. The page's disconnect button gets this for free through `ProfileSection` — do **not** rely on any post-disconnect React state.

## Acceptance criteria

- [ ] `/profile` renders inside `Shell` as a client route.
- [ ] Identity header shows the correct avatar disc, name, and status line for all three states (AuthLinked / ProfileLinked-only / Anonymous).
- [ ] Welcome-back banner fires exactly once when `sessionStorage["signin-restore-welcome"]` is present, then clears the flag.
- [ ] `ProfileSection` is reused verbatim with all props wired (including required `onSignIn` from `signInWithGoogle`); name-save works.
- [ ] Auth callback redirects to `/profile` when the link response is `restored: true`, and still clears the saved redirect key.
- [ ] Greek-only player-facing strings; Tailwind tokens only; no `device_uuid` exposed in any URL.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.

## Blocked by

- None — can start immediately.
