# Fluid Active CPU — investigation & value analysis (2026-07-05)

## Context
Vercel Hobby gauge: **2h31m / 4h Fluid Active CPU** for the month. Fluid bills
*active* CPU only — Supabase/network waits are ~free; JSON parsing, React SSR,
and RSC payload serialization are what bill.

**Traffic distribution (per operator): ~90% of all traffic is Leksokipos.**

## What was shipped today (fixes 3 + 4)

| Fix | Change | Effect |
|-----|--------|--------|
| 3 | `/leksokipos` redirect page now imports a slim 108 KB `puzzles-index-el.json` (id/date/letters via `src/data/leksokipos/puzzleIndex.ts`) instead of the `@/data` barrel | Cold start of the **highest-traffic route** no longer parses 23.5 MB (words-el 19.45 MB + puzzles-el 4.11 MB) to issue a redirect. Verified in `.next` output: biggest chunk referenced by that page is now 0.2 MB (was a 22.15 MB chunk). |
| 4 | `[center]/[outer]` `revalidate` 3600 → 604800 | Each letter-combo page regenerates weekly, not hourly — 24×+ fewer regenerations, each of which parses the 22 MB chunk and may run the 811k-word scan. |

Given the 90/10 traffic split, these two fixes target the routes where the CPU
actually burns. **Every Leksokipos entry hit the redirect function**; every cold
start of it paid ~0.5–1 s of JSON parse. That, plus hourly ISR churn on
`[center]/[outer]`, plausibly accounts for the bulk of the 2h31m.

## Local measurements (prod build, warm requests, dead-Supabase env)

Constant ~7 s across all routes = Supabase connection failure wait (I/O — not
billed). The **delta** between heavy and light pages is the billable part:

| Route | median | body size |
|-------|--------|-----------|
| /leksiarxeio | 7218 ms | **2414 KB** |
| /vres-tin-frasi | 7239 ms | **2434 KB** |
| /leksindeseis (baseline) | 7030 ms | 20 KB |
| /stavrolekso (baseline) | 7037 ms | 11 KB |

→ **~150–190 ms extra per view** on the two word-list pages (array build + RSC
serialization of ~2.4 MB), and a 2.4 MB response body per view (also billed as
Fast Data Transfer, and slow on mobile).

## Value verdict for the remaining items

**Item 1 — word lists out of the SSR payload (leksiarxeio, vres-tin-frasi)**
- CPU value: **low-moderate**, revised down. These pages are ≤10% of traffic;
  ~150 ms × their views is small next to what fixes 3+4 already removed.
- Real value: **page weight** (2.4 MB → ~20 KB per view; UX on mobile + Fast
  Data Transfer quota) and it makes item 2's caching effective (a cached 2.4 MB
  page still transfers 2.4 MB per view).
- Verdict: **worth doing**, primarily as a UX/data-transfer fix, not a CPU fix.

**Item 2 — daily pages ISR + once-per-day community-puzzle consumption**
- CPU value: **low** post-traffic-info (same ≤10% of views).
- Real value: **correctness bug fix** — `consumeApprovedPuzzle` runs per page
  view on force-dynamic pages, so any visitor can eat a queued community puzzle
  and two same-day visitors can get different puzzles. That's a product bug
  worth fixing regardless of billing.
- Verdict: **worth doing for correctness**; CPU savings are a side benefit.

**Recommended before investing further:** deploy fixes 3+4, then watch the
Fluid gauge for 3–5 days and check dashboard → Observability → Functions
(sort by CPU) to confirm the redirect/ISR churn was the dominant consumer.
If leksokipos cold starts still dominate after 3+4, the next lever is lazy-
loading `words-el.json` (dynamic import inside `buildCustomPuzzle`) so daily-
puzzle renders parse only `puzzles-el.json` (4 MB), not 23.5 MB.

## Post-deploy read-out (2026-07-08)

Fixes 3+4 reached production 2026-07-05 ~07:10 UTC (merge `4db1eb9`). Gauge:
**2h31m (Jul 5) → 3h1m (Jul 8)** = ~30 min in ~3 days ≈ **10 min/day** post-fix.
Operator reads the daily chart as ~20% lower. Confound: the Jul 7 prod deploy
added achievements endpoints (`/api/achievements`, `/api/pangrams`) — new CPU
consumers inside the post-fix window. No runtime errors in 7 days (fixes are
regression-free). Vercel MCP exposes no per-function CPU metrics — the
Observability → Functions CPU sort is dashboard-only, as is the billing-cycle
reset date.

**Headroom warning:** 59 min left of the 4h Hobby cap. At ~10 min/day that's
exhausted ~Jul 14 unless the billing cycle resets first — check the reset date
in the dashboard. If more CPU cut is needed, next lever per this doc: lazy-load
`words-el.json` (dynamic import in `buildCustomPuzzle`); items 1+2 help a
little too.

**Dashboard Functions-by-CPU confirmed it (2026-07-08):** `[center]/[outer]`
44 inv / 1m total ≈ 1.4 s per invocation = dominant burner; redirect page now
57 ms/inv (fix 3 verified working). → **Lazy-load implemented same day**
(session 70): `buildCustomPuzzle` async + `await import("../words-el.json")`
on the cache-miss path only; guard test in `deploymentReadiness.test.ts`.
Next lever after this: prerender daily combos —
see `.claude/handoffs/HANDOFF-prerender-daily-combos.md`.

## Prerender daily combos — implemented (2026-07-10, session 71)

`generateStaticParams` on `[center]/[outer]` now prerenders **all 1008 prebuilt
combos** at build time (params from the slim index via `getPrebuiltPuzzleParams`,
guarded canonical in `puzzleIndex.test.ts` + source-guard in
`deploymentReadiness.test.ts`). Build output: route flipped `ƒ` → `●` (SSG).
**Build time unchanged: 17.7 s before → 16.7 s after** (noise — each prerender
is a lookup in the once-parsed puzzles-el.json). Local prod smoke: `/leksokipos`
307 → today's combo 200 in **8 ms** (prerendered, on disk); custom combo 200
cold 1.12 s / warm 3 ms; encoded-Greek URL still 307s to greeklish canonical.

**Re-measure verdict:** the `local-measurements.txt` harness was NOT re-run —
it measured `/leksiarxeio`+`/vres-tin-frasi` RSC payloads (items 1–2), which
this change doesn't touch, and local request latency can't show this win anyway
(warm ISR and prerendered pages are both ~ms locally; the saving is prod *cold
Fluid invocations*). The meaningful before/after is (a) build-time delta
(above, ~zero) and (b) **post-deploy Vercel Observability → Functions**:
`[center]/[outer]` should drop from ~44 inv/1m CPU to near-zero (only custom
combos remain). Check 2–3 days after the merge to main.

## Measurement method note
`npm run build` + `npm run start` with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9`
(build-time-inlined, so a rebuild was required) — guarantees no prod-DB writes
from the consume-on-render path while measuring. Raw output:
`local-measurements.txt`.
