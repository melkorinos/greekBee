# ADR 0007 — Google OAuth augments device identity, does not replace it

**Status**: Superseded in part by ADR 0012 — merge/restore semantics inverted (auth account is now the anchor); the anonymous-first stance and TransferCode retention stand

## Context

The platform uses DeviceId (anonymous browser UUID) as the primary identity carrier. `player_profiles` links a DeviceId to a DisplayName. TransferCode handles deliberate cross-device migration. There is no login concept.

Adding Google OAuth was proposed as an architectural preference — outsourcing identity management rather than solving a specific user pain point. Three approaches were considered:

- **A (Replace)**: Remove the DeviceId system. All persistence requires a Google account.
- **B (Augment, anonymous-first)**: Keep DeviceId as the default. Google sign-in is optional and links the existing anonymous profile to a persistent identity.
- **C (Augment, required for features)**: Keep anonymous play, but gate Leaderboard writes and cross-device sync behind Google sign-in.

## Decision

**Option B + C combined**: anonymous play is never blocked, but Leaderboard writes and cross-device sync require either ProfileLinked (existing behaviour) or AuthLinked (new). Google sign-in is the preferred path for cross-device continuity; TransferCode remains as a no-account fallback.

Merge behaviour on first sign-in: the active DeviceId is silently linked to the Google `auth_user_id`. Existing `player_profiles` row is updated; existing `game_scores` rows are back-filled with `auth_user_id`. DisplayName is pre-populated from Google only when blank.

## Reasons

- Replacing DeviceId would break every existing anonymous player's history with no migration path.
- Augmenting keeps the platform accessible to players who do not want a Google account.
- TransferCode covers the "no Google account" cross-device case already; it is redundant for AuthLinked players but harmless to retain.
- `AuthLinked → ProfileLinked` always holds (sign-in creates or merges a profile), so the existing sync gate (`isProfileLinked`) requires no change.

## Consequences

- `player_profiles` gains a nullable `auth_user_id` column (FK to Supabase `auth.users`).
- `game_scores` gains a nullable `auth_user_id` column. Leaderboard queries prefer `auth_user_id` when AuthLinked, fall back to `device_uuid`.
- RLS: anonymous rows writeable via `device_uuid` header; once `auth_user_id` is set on a row, only the matching JWT can write (stricter path).
- `ProfileSection` shows "Signed in as [name] · Αποσύνδεση" when AuthLinked; TransferCode block is hidden for AuthLinked players (still available for ProfileLinked-only players).
- `/auth/callback` redirects back to the referring page (stored in a short-lived cookie before OAuth initiation).
- Leaderboard entry points on the landing page: one 🏆 icon per applicable game card (Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi). Opens the existing per-game LeaderboardModal, which contains ProfileSection and the Google sign-in button.
