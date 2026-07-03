# Handoff: Manual testing checklist — everything on `dev` before merging to `main`

**Purpose:** the single cumulative checklist of manual verification for all work stacked on `dev`. The user runs everything **once, at the end**, before the dev → main merge; the agent verifies DB state via the Supabase MCP (`execute_sql`, read-only checks).
**Rule for future sessions:** every epic that lands on `dev` **appends its own section here** (same format: numbered flows, expected results, verification SQL). Do not create separate per-epic test docs.

**Sections so far:**
1. Google identity epic (sign-in / Restore / Disconnect / `identity_audit`) — added 2026-07-03, session 60
2. *(pending)* Profile Page + Trophy Case — the implementing session appends this; its plan draft lives in `profilePageAndAchievements.md` §7

**⚠️ One environment fact that shapes everything:** there is no dev database. `npm run dev` talks to the **production** Supabase project (single project, one URL set in `.env.local`). Every test below writes real rows. Use an obviously-fake display name (e.g. `ΔΟΚΙΜΗ-1`) so test rows are identifiable; `game_scores` is append-forever, so prefer marking over deleting.

---

## 1. Google identity epic (added 2026-07-03, session 60)

**Code status:** all shipped and green (`1208 pass / 6 skipped · eslint 0 · build 0`); `identity_audit` migration pushed to prod and verified (RLS on, zero policies). Untested manually.
**Best surface:** the Profile Page (`/profile`) once Epic B ships — it displays identity state directly. Until then, every flow is reachable via the 🏆 leaderboard modals (home page + all four game boards).

### What shipped (what you are testing)

| Slice | Behaviour under test |
|---|---|
| 1 | `/api/auth/link` derives identity from the verified JWT; 401 without it |
| 2 | **Sign-in Restore**: second device adopts the account's canonical DeviceId; local history merged, best score per puzzle wins |
| 3 (+follow-up) | **Disconnect** (profile disconnect AND Google sign-out): full local reset — fresh DeviceId, name/slices wiped, then **hard page reload**. Nothing server-side is deleted |
| 4 | Σύνδεση με Google offered in every ProfileSection when not AuthLinked (all 4 boards + home), including ProfileLinked "upgrade" state |
| 5 | `identity_audit`: one row per *mapping change* at link-time (first link / overwrite); **no** row on repeat sign-in, restore, or disconnect |

### A. Anonymous baseline (browser A)
1. Fresh profile-less state (or Disconnect first). Play a daily puzzle to post a score.
2. **Expect:** score on the leaderboard under the anonymous/chosen name.
   ```sql
   select device_id, game_id, puzzle_date, score from game_scores order by created_at desc limit 5;
   ```

### B. First Google sign-in (link mode)
1. 🏆 → ProfileSection → **Σύνδεση με Google** → complete OAuth. Should return to the page you left (callback restores `auth-redirect`; after Epic B, `restored:true` lands on `/profile` instead).
2. **Expect:** signed-in state in ProfileSection; sign-in button gone, Αποσύνδεση offered.
   ```sql
   select device_uuid, display_name, auth_user_id from player_profiles where auth_user_id is not null;
   select count(*) from game_scores where auth_user_id is not null;  -- back-fill stamped
   select auth_user_id, device_uuid, at from identity_audit order by at;  -- +1 row (first link)
   ```
3. Sign out, sign in again with the same account on the same browser.
4. **Expect:** works, and `identity_audit` has **no new row** (change-only).

### C. Google sign-out is a full Disconnect (slice 3 + reload)
1. While signed in with a name and an in-progress game: 🏆 → Αποσύνδεση.
2. **Expect:** the page **hard-reloads**; afterwards the device is a brand-new anonymous player — no display name, empty game sessions (found words gone), new DeviceId. Server keeps everything:
   ```sql
   select device_uuid, display_name from player_profiles where auth_user_id is not null;  -- unchanged
   select count(*) from identity_audit;  -- unchanged (disconnect never writes)
   ```
3. Profile-disconnect path (create a name-only profile first, no Google): same expectations — reset + reload.

### D. Sign-in Restore + merge (browser B / incognito)
1. In a fresh browser, play a **different** daily puzzle anonymously (own score), and ideally also the **same** puzzle as browser A with a *lower* score (to see best-wins).
2. Sign in with the **same** Google account.
3. **Expect:** identity comes back (name from the account); after Epic B, redirect to `/profile` + welcome banner (`signin-restore-welcome`). Leaderboards show **merged** history: union of puzzles, best score where both played.
   ```sql
   select device_id, game_id, puzzle_date, score from game_scores order by puzzle_date desc limit 10;
   -- all rows on ONE canonical device_id; no duplicate (game_id, puzzle_date) pairs
   select count(*) from player_profiles;  -- browser B's temp profile row (if any) deleted
   select count(*) from identity_audit;   -- unchanged: restore establishes no new mapping
   ```
4. Leksokipos daily session restore on B (`leksokipos-needs-restore`): found words for today's puzzle should reappear.

### E. Slice 4 visibility sweep (quick)
Open the 🏆 modal on **home + all four boards** while (a) anonymous and (b) ProfileLinked-without-Google: Σύνδεση με Google must be offered in both states, in all five places. While AuthLinked: no sign-in button, sign-out present.

### F. Regression spot-checks
- TransferCode generate + claim still work (claim = adoption mechanic shared with Restore).
- Score posting immediately after a Disconnect-reload attaches to the **new** DeviceId (this was the stale-deviceId bug — fixed by the reload).

### Known-accepted behaviours (don't file as bugs)
- **Shared-computer overwrite** (sign-in over someone else's linked device steals/absorbs the row) — known, recorded as issue `01-signin-overwrites-foreign-linked-identity.md`; `identity_audit` makes it admin-recoverable.
- Restore is silent by design (union merge, nothing discarded); welcome toast is flag-only until Epic B.
- Repeat sign-ins produce zero audit rows — that's the change-only contract, not a missed write.

Any real misbehaviour → `/diagnose`. Recovery drill if a test identity gets lost: `docs/admin-restore.md` (now includes the `identity_audit` history query).
