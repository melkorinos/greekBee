# Admin Restore — break-glass identity recovery

> Scope: recovering **one player** while the database is alive. If the **whole DB**
> is lost or corrupted, this doc can't help (there's nothing to query) — see
> [disaster-recovery.md](disaster-recovery.md).

When a player loses their identity (device wiped, merge mishap, anything unpredictable), recover it with DB access alone — no app code involved. The player gives you their email (or Google identity); you issue them a TransferCode; they claim it in ProfileSection like any transfer. See ADR 0012 and the **Admin Restore** glossary entry in `CONTEXT.md`.

Run these in the Supabase SQL editor (prod project).

## 1. Email → auth user

```sql
select id, email, created_at
from auth.users
where email = 'player@example.com';
```

## 2. Auth user → device

```sql
select device_uuid, display_name, last_active
from public.player_profiles
where auth_user_id = '<id from step 1>';
```

**If this returns nothing** (the row was overwritten by another account's sign-in on a shared device, or deleted by a restore-merge — see ADR 0012; note a plain Google disconnect does *not* clear this mapping, it is local-only):

- check `identity_audit` for the mapping history — every pair `/api/auth/link` ever established is logged, newest last:

```sql
select device_uuid, at
from public.identity_audit
where auth_user_id = '<id from step 1>'
order by at;
```

- otherwise fall back to searching by name — not unique, so confirm with the player via `last_active` / score history before proceeding:

```sql
select device_uuid, display_name, last_active
from public.player_profiles
where display_name ilike '%name they remember%';
```

## 3. Issue a TransferCode

The code must respect the app's format: **6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`** (no I/1/O/0). `expires_at` defaults to 24h, `used` to false.

```sql
insert into public.transfer_codes (code, device_uuid)
select string_agg(substr(alphabet, floor(random() * 32)::int + 1, 1), ''), '<device_uuid from step 2>'
from generate_series(1, 6), (select 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'::text as alphabet) a
returning code, expires_at;
```

Send the returned code to the player. They enter it under Μεταφορά in any leaderboard's profile section; claiming adopts the DeviceId and everything (name, history, achievements) returns.

## Notes

- Codes are single-use and expire in 24h — issue a fresh one per attempt, don't reuse.
- This restores *identity*, not live sessions; only Leksokipos daily progress syncs back (`game_state`).
- If the profile row itself was deleted, recreate it first (`insert into player_profiles (device_uuid, display_name) values (...)`) — `game_scores` history is append-forever and still keyed to the old `device_uuid`.
