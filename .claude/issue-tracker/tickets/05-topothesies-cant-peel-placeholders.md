# Topothesies: what happens to the 6 can't-peel placeholders?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:grilling`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_
**Blocked by:** [Πόρος island geometry](04-topothesies-poros-island-geometry.md)

## Question

For each of the 6 islands in `CANT_PEEL_PLACEHOLDERS`, decide: emit via the `place=island`
override, build real polygon splitting, or drop permanently?

From `.claude/handoffs/topothesies-unpeelable-and-review.md` thread 3. These islands share a
δήμος with a larger island, so an attribute peel by QID cannot produce them. They have no
`ANSWER_META` and no geometry, and render as flagged placeholder cards in the preview:

| Island | Shares δήμος with | Has a capital? |
|---|---|---|
| Κουφονήσια (Άνω Κουφονήσι) | δ. Νάξου | yes |
| Σχοινούσα | δ. Νάξου | yes |
| Ηρακλειά | δ. Νάξου | yes |
| Δονούσα | δ. Νάξου | yes |
| Κάλαμος | δ. Λευκάδας | yes |
| **Δήλος** | δ. Μυκόνου | **no — uninhabited** |

The clean path would be **connected-component polygon splitting** of a dissolved δήμος polygon
— a real pipeline feature the v1 attribute peel does not have. But the `place=island`
coastline override sidesteps it entirely for the five with a capital: fetch each island's own
`place=island` geometry and attach it to a new answer id, never splitting the shared δήμος at
all.

**That is why this is blocked** on the Πόρος ticket — it is the same mechanism, and there is no
point deciding here until we know whether the override actually works.

**Δήλος is the exception and should probably be decided separately.** It is uninhabited and has
no capital, so even a perfect split leaves it unable to do the capital bonus round. The handoff
already calls it *"likely a permanent drop"* — confirm or overturn that explicitly rather than
letting it ride along with the other five.

Worth weighing in the grill: whether six more Cycladic islets are even *desirable* answers at
103 live, or whether they make the game harder in an unfun way. Adding an answer is not
automatically an improvement.

**If any are emitted**, re-check `PROXIMITY_MAX_KM` in `src/config/gameRules.ts` (currently
938) — the answer set moving changes the max pairwise centroid distance.
