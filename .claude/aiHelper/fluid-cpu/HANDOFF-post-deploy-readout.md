# Handoff — post-deploy read-out: did prerendering kill the Fluid CPU burn?

> For a fresh agent, ~1 week after the prerender change reaches production.
> Start with `/aihelper`, then read `fluid-cpu/analysis.md` (full history).
> This is a **measurement + verdict** session — no product code expected.
> Load `/project-mcp` before any Vercel/Supabase MCP call.

## What shipped (session 71, 2026-07-10)

`generateStaticParams` on `/leksokipos/[center]/[outer]` prerenders all 1008
prebuilt combos at build time → CDN serves every daily-puzzle view with zero
Fluid CPU. Ships together with session 70's lazy-load (`buildCustomPuzzle`
async-imports words-el.json). Runtime rendering remains only for user-invented
custom combos (ISR, `revalidate=604800`).

**Fill in at merge time:** merge commit `______`, prod deploy date/time `______`.
(As of 2026-07-10 both sessions sat uncommitted on `dev`, browser play-through
pending — if that's still true, this read-out has no start date yet.)

## Baseline (pre-change, from analysis.md)

| Metric | Value | Source |
|--------|-------|--------|
| Fluid gauge burn rate | **~10 min/day** (3h1m/4h on Jul 8) | dashboard gauge |
| `[center]/[outer]` | **44 inv / 1m CPU ≈ 1.4 s per inv** — dominant, ~43% of function CPU | dashboard → Observability → Functions, sort by CPU |
| `/leksokipos` redirect | 57 ms/inv (fix 3 verified) | same |
| Billing cycle | reset date unknown — was expected to exhaust ~Jul 14 | dashboard only |

## Steps

0. **Immediately post-deploy (don't wait a week for this one):** in the prod
   deployment's build logs (`get_deployment_build_logs`), confirm the route
   table shows `● /leksokipos/[center]/[outer]` with ~1008 paths, and note the
   Vercel build duration (local delta was zero: 17.7→16.7 s; Hobby limit 45 min).
   Also `get_runtime_errors` — expect none.
1. **After ~7 days:** dashboard → Observability → Functions, sort by CPU
   (dashboard-only — Vercel MCP exposes no per-function CPU). Record for
   `[center]/[outer]`: invocations, total CPU, CPU/inv. **Success: mostly gone
   from the top** — remaining invocations should be custom combos only.
2. Record the Fluid Active CPU gauge + compute min/day since deploy.
   **Success: well below 10 min/day.** Confounds to note explicitly:
   - billing-cycle reset inside the window (check reset date in dashboard) —
     if it reset, compare daily *rate*, not gauge totals;
   - any other deploys/features added in the window (Jul 7 achievements
     endpoints are already inside the baseline).
3. Note what NOW tops Functions-by-CPU. This decides whether the still-pending
   items 1+2 (word-list SSR payload; consume-per-view correctness bug — see
   analysis.md verdicts; full handoff deleted 2026-07-10, recoverable from git
   history) are worth doing as CPU work, or only for UX/correctness.
4. **Append the read-out to `analysis.md`** (follow the existing
   "Post-deploy read-out" pattern), update `log.md`, then **delete this file**.

## Success criteria (all three)

- `[center]/[outer]` no longer a top Fluid CPU consumer (near-zero CPU/day).
- Gauge burn rate materially below 10 min/day.
- Zero new runtime errors on the route; daily puzzle plays normally in prod.
