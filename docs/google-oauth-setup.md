# Google OAuth — setup & operations runbook

How Google sign-in is provisioned for the platform. The *architecture* (why OAuth
augments the DeviceId, how Restore adopts identity) lives in
[ADR 0007](adr/0007-oauth-augments-device-identity.md) and
[ADR 0012](adr/0012-signin-restore-adopts-device-identity.md); this doc is the
**operational** record — where the config lives, what the values are, and how to
change them.

## Where the pieces live

- **App code** does nothing provider-specific beyond calling
  `signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/auth/callback } })`
  in [`src/lib/supabase.ts`](../src/lib/supabase.ts). It reads `window.location.origin`
  at runtime, so the same build works on localhost and prod with no env change.
- **No secret in the repo or `.env`.** The OAuth handshake is entirely Supabase-side.
  The app never sees the client secret.
- **Supabase** (project `rnfsuvhgufhbekodkmlp`) → Authentication → Providers → Google
  holds the client ID + secret and is the runtime that talks to Google. **One
  Supabase project serves both local dev and prod**, so enabling the provider once
  covers both.
- **Google Cloud** holds the OAuth client and consent screen (source of truth for
  the secret).

## Current configuration

| Item | Value |
|---|---|
| Google Cloud project | `greek-word-games` |
| OAuth client ID (public, not a secret) | `97410724847-j8472jdtp8thlg6venao21upacmbm9b0.apps.googleusercontent.com` |
| Client secret | **not stored here** — Google Cloud → Credentials → the client → Reset secret; then paste into Supabase |
| Authorized redirect URI (in Google) | `https://rnfsuvhgufhbekodkmlp.supabase.co/auth/v1/callback` |
| Supabase redirect allow-list | `http://localhost:3000/**`, `https://<PROD-DOMAIN>/**` |
| Consent screen audience | External |

> The redirect URI in Google is **Supabase's** callback, not the app's. Google →
> Supabase → app. The app's own `/auth/callback` is only ever in Supabase's
> redirect allow-list, never in Google's client config.

## First-time setup (done — recorded for reproduction)

1. **Google Cloud** → new project → OAuth consent screen (External) → app name
   `Leksarxeia`, support + developer contact = owner email.
2. **Credentials** → Create OAuth client ID → *Web application* → Authorized
   redirect URI = the Supabase callback above. Copy client ID + secret.
3. **Supabase** → Authentication → Providers → Google → enable, paste ID + secret.
4. **Supabase** → Authentication → URL Configuration → add the app origins to
   Redirect URLs; set Site URL to the prod domain.

## Testing vs Published (consent screen)

- While the consent screen is in **Testing**, only Google accounts added under
  **Audience → Test users** can sign in. Fine for dev.
- For real prod users, hit **Publish app** on the consent screen. No Google
  verification is required as long as only basic scopes (profile/email) are
  requested — which is all Supabase asks for.

## Rotating the secret

Google Cloud → Credentials → the OAuth client → **Reset secret** → copy the new
one → Supabase → Providers → Google → replace + Save. No code or app deploy needed.

## API key generations (env vars)

Supabase is migrating from legacy JWT keys (`eyJ…`, ~200 chars) to the new
format: `sb_publishable_…` (client) and `sb_secret_…` (server). Both generations
work today, but **use matching-generation keys from the same dashboard page**
when configuring an environment, to avoid confusion. The app needs:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client (publishable).
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by `/api/auth/link` via the
  service-role client to bypass RLS for the back-fill. A missing/empty value
  makes that route 500.

## Troubleshooting

- `400: Unsupported provider: provider is not enabled` (seen on Supabase's
  `/authorize`, or surfaced in the app as a Greek "σύνδεση απέτυχε" line) → the
  Google provider toggle is **off** in Supabase. Enable it.
- `redirect_uri_mismatch` from Google → the URI in the Google client doesn't
  exactly match `https://rnfsuvhgufhbekodkmlp.supabase.co/auth/v1/callback`.
- App redirects back but no session → the app origin isn't in Supabase's redirect
  allow-list.
- Callback shows **"Λείπει ο κωδικός επιβεβαίωσης"** → the Supabase client is in
  the implicit flow (tokens in the URL hash) but `/auth/callback` expects PKCE
  (`?code=`). The client is pinned to `flowType: "pkce"` + `detectSessionInUrl:
  false` in `src/lib/supabase.ts` for this reason — don't revert it. Guarded by
  `src/test/shared/supabase.test.ts`.
- Sign-in works but `POST /api/auth/link` returns **500** (`Cannot read
  properties of undefined (reading 'rest')`) → `supabase.from` was called
  detached (`this` lost). It must be `supabase.from.bind(supabase)`. Fixed +
  guarded by `src/test/api/auth-link.test.ts`. This linking step is what stamps
  `auth_user_id` onto the player's `game_scores`/`player_profiles`, so a 500 here
  silently skips the back-fill even though the session still establishes.
- Live auth errors are visible in Supabase → Logs → Auth (or via the Supabase MCP
  `get_logs` with `service: "auth"`); route/DB errors under `service: "api"`.
