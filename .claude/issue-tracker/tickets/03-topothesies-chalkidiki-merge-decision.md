# Topothesies: keep or un-merge the Θεσσαλονίκη → Χαλκιδική composite?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:prototype`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_

## Question

`chalkidiki` is **live** and looks wrong. Keep the merge and accept the composite silhouette,
or un-merge and restore `thessaloniki` as its own answer?

From `.claude/handoffs/topothesies-unpeelable-and-review.md` thread 2: on 2026-07-22 the whole
Π.Ε. Θεσσαλονίκης was dissolved into `chalkidiki` (`RU_TO_ID` + `MUNI_RU_FIX_WD` in
`curation.ts`). The silhouette is now Χαλκιδική's recognisable three-finger peninsula **plus**
the Θεσσαλονίκη metro sprawl — probably an unrecognisable composite. This is live in front of
players today, so it is a launch-quality question, not a backlog nicety.

This is a **curation call, not a geometry-fetch fix** — no new pipeline capability is needed
either way.

The tension worth grilling: Θεσσαλονίκη was merged in the first place because it *"doesn't read
as its own silhouette"*, mirroring the Αθήνα→Αττική treatment. So un-merging trades one
unrecognisable shape for a different one. The third option nobody has written down — drop
Θεσσαλονίκη entirely and let `chalkidiki` be just Χαλκιδική — should be considered explicitly
rather than falling out by accident.

**Approach:** use `/prototype`. The preview pipeline already exists and makes this cheap:

```
TOPO_PREVIEW=1 npx tsx scripts/generateTopothesies.ts
node scripts/lib/topothesies/preview-outlines.mjs
# → .claude/aiHelper/outlines-preview.html
```

Render all three candidates (composite as-is / un-merged pair / Χαλκιδική alone) and judge by
eye. Link the preview HTML as an asset on this ticket.

**If un-merging wins**, the resolution must note the follow-on work: revert the
`RU_TO_ID` / `MUNI_RU_FIX_WD` / `ANSWER_META` changes, regenerate, and **re-read the pipeline's
printed `PROXIMITY_MAX_KM`** and update `src/config/gameRules.ts` if the answer set moved
(currently 938, set by Καστελλόριζο).
