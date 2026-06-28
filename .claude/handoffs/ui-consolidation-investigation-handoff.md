# Handoff — UI Consolidation Investigation

**Project:** Greek Word Games Platform (`c:\repos\try`)  
**Branch:** `dev`  
**Date:** 2026-06-28  
**Focus for next session:** Full investigation into what should and should not be consolidated in the UI layer — specifically in `src/styles/recipes.ts` and `src/config/`.

---

## What happened this session

A sequence of minor UI corrections was applied to Leksokipos, all on the `dev` branch (clean, committed as you start). Each change was intentionally small and targeted.

### 1 — Header icon buttons (variant toggle / share / help)

Three circular buttons in the Leksokipos header were misaligned in size and inconsistent in dark-mode border colour.

**Files changed:**
- `src/styles/recipes.ts` — added `btnHeaderIconSize = "w-8 h-8"`; changed `btnHeaderIcon` border from hardcoded `border-stone-300` to semantic `border-border` (stone-200 light / stone-700 dark, same as the horizontal page separator)
- `src/components/leksokipos/LeksokiposLayout.tsx` — variant toggle: `w-7 h-7` → `${btnHeaderIconSize}`
- `src/components/leksokipos/ShareButton.tsx` — idle state tokenised: `border-stone-300 text-stone-600 hover:bg-stone-100 active:bg-stone-200` → `border-border text-muted hover:bg-surface-raised active:bg-border`; uses `btnHeaderIconSize`
- `src/components/shared/HowToPlayModal.tsx` — default trigger now uses `${btnHeaderIconSize} ${btnHeaderIcon} text-sm font-bold` instead of its own inline class

### 2 — ScoreBar visual corrections

- Removed the `▾` triangle toggle indicator
- Removed `underline` from the rank label
- Flipped emoji order: `{emoji} {name}` → `{name} {emoji}` everywhere (rank label, ladder rows, next-rank hint)
- Wrapped the RankIcon SVG in a circle: `${btnHeaderIconSize} ${btnHeaderIcon} group-hover:bg-surface-raised group-hover:text-accent`
- Wrapped the trophy button in a circle: `${btnHeaderIconSize} ${btnHeaderIcon} text-trophy leading-none` (`leading-none` needed to centre colour emoji)

**File changed:** `src/components/leksokipos/ScoreBar.tsx`

### 3 — Give-up button alignment

`src/components/leksokipos/FoundWordsList.tsx`: `giveUpRow` changed from `justify-end` to `justify-start`.

---

## Current state of the consolidation layer

### Authoritative files

| File | Role |
|------|------|
| `src/app/globals.css` | CSS custom properties (`--border`, `--surface`, `--muted`, …). **True single source** for all colour tokens. Dark overrides under `.dark {}`. |
| `src/styles/recipes.ts` | Exported Tailwind class strings (composite "molecules"). Imported by components. |
| `src/config/gameRules.ts` | Numeric game constants (guess limits, score caps). |
| `src/config/games.ts` | Game registry (labels, hrefs, descriptions). |
| `src/config/platform.ts` | Brand name. |
| `src/config/retention.ts` | DB retention window (days). |

### What is currently in recipes.ts

```
btnHeaderIconSize   "w-8 h-8"                    — circle diameter, shared by 5 buttons
btnHeaderIcon       rounded-full border-border …  — circle style
btnSecondary        rounded-full border-border …  — Delete/Clear/Shuffle
btnPrimary          bg-inverted …                 — Submit/Save
btnPrimaryCompact   …                             — modal primary
btnGiveUp           border-danger/40 …            — destructive tone
btnCancel           border-border …               — modal cancel
btnModalSubmit      bg-inverted …                 — modal submit
labelClass / labelOptionalClass
inputClass / inputReadonlyClass / inputCompactClass
colorCenterLetter / colorOuterLetter / colorPangramBg / …
feedbackValidContainer / feedbackPangramClass / feedbackErrorClass / …
foundWordClass / foundWordPangramClass
scoreBarTrack / scoreBarFill
lbRowBase / lbRowPlayer / lbTdRank / lbTdName / lbTdScore
```

---

## The open question — what to investigate

At the end of the session the following critical assessment was made:

**What is working well:**
- Coarse-grained recipe strings (`btnSecondary`, `btnHeaderIcon`) are valuable — they bundle a full component spec and prevent copy-paste drift across files.
- `btnHeaderIconSize` is a justified constant because pixel-exact equality across N components is a hard constraint that must not drift.
- `--border` in `globals.css` is the real consolidation point for the platform gray. All interactive-element borders already reference it.

**Where there is risk:**
- `recipes.ts` is trending toward a shadow-utilities file: a parallel theming system on top of Tailwind, which is already a theming system.
- Exported string constants have no type safety. Tailwind Intellisense cannot validate them. A typo silently produces broken CSS with no build error.
- String concatenation (`${btnHeaderIconSize} ${btnHeaderIcon}`) is not composable the way Tailwind variants are — it can produce duplicate or conflicting utilities (e.g., `hover:bg-surface-raised` from `btnHeaderIcon` plus `group-hover:bg-surface-raised` added manually in ScoreBar).
- Extracting individual Tailwind utilities into named constants (e.g., a hypothetical `uiBorderClass = "border-border"`) adds indirection without reducing change surface — the CSS token in `globals.css` already does that job better.

**Questions for the investigation:**

1. **Where is the right boundary for recipes.ts?** Full component specs seem fine. How granular should colour aliases go — is `colorCenterLetter = "text-accent"` useful or just noise?

2. **Should recipes be typed?** Consider `as const` objects or a type-checked builder. Currently any string is valid — no guard against invalid Tailwind classes.

3. **Are there scattered inline classes that should be promoted to recipes?** Audit components for repeated inline class patterns not yet in recipes.ts (especially `dark:` pairs that sneak into components against the stated no-dark-pairs rule).

4. **Is there anything in `src/config/` that belongs in `globals.css` instead, or vice versa?** The split between CSS-land and TS-land consolidation may need a clearer contract.

5. **Does ShareButton's state-based styling (`idle/copied/error`) belong in recipes, or is it inherently component-local?** Idle state is now tokenised; green/red feedback states are still hardcoded. Is that split correct?

6. **The `group-hover` pattern in ScoreBar is a smell.** The RankIcon circle uses both `hover:bg-surface-raised` (baked into `btnHeaderIcon`) and `group-hover:bg-surface-raised` (added manually at the call site). The recipe doesn't know about its group context. Should circle recipes be group-aware, or is this a documented exception?

---

## Suggested skills

```
/aihelper          — reload full project context before starting (soul, memory, goals, log)
/grill-me          — stress-test the proposed consolidation strategy before implementing
/improve-codebase-architecture  — surface seams and over-abstraction in recipes.ts
/code-review       — review any changes made during the investigation
```

---

## How to run checks

```powershell
npm run test -- --run    # 1113 passing at handoff
npx eslint .
npm run build
```

All three must stay green. Use `Select-Object -Last N`, not `tail`.

---

## Do not touch

- `words-el.json`, `puzzles-*.json` — word data, off-limits
- `supabase/migrations/` — schema changes require a new migration file + `npx supabase db push`
- Tests — never delete, only add
