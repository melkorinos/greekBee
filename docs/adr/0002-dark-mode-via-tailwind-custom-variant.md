# ADR 0002 — Dark mode via Tailwind v4 `@custom-variant`, not `prefers-color-scheme`

**Status**: Accepted

## Context

The platform moved to full light mode in session 36. A manual dark/light toggle was requested for the Shell header. The previous locked architecture decision ("no `dark:` classes") was written to prevent the OS `prefers-color-scheme: dark` media query from half-activating dark styles during incremental builds — not to permanently forbid dark mode.

## Decision

- Add `@custom-variant dark (&:where(.dark, .dark *));` to `globals.css`. This mints a `dark:` Tailwind prefix that fires **only** when a `.dark` class is present on an ancestor — never from OS preference.
- Remove the `@media (prefers-color-scheme: dark)` block from `globals.css` entirely.
- The Shell applies/removes `.dark` on `document.documentElement` via a `useTheme` hook.
- Theme preference is persisted in a standalone `localStorage` key `"theme-preference"` (`"light" | "dark"`). It lives outside the `wordgames:state` envelope so it survives `clearSlice` calls.
- Retire the "no `dark:` classes" rule. Replace it with: **"no `prefers-color-scheme` dark mode — all theme switching is manual via the `.dark` class."**

## Alternatives considered

**CSS custom properties only** — define semantic tokens (`--color-bg` etc.) and use `bg-[var(--color-bg)]` throughout. Rejected because it conflicts with the existing `styles.ts` pattern of plain Tailwind utility strings, requiring a much larger refactor with no other benefit.

## Consequences

- `dark:` prefixes work across the codebase but only respond to `.dark` on `<html>`, never OS setting.
- All `dark:` additions are purely additive — light mode is unchanged.
- A blocking `<script>` in `layout.tsx` can be added later (one line) to eliminate flash-of-wrong-theme without changing this approach.
- `styles.ts` Leksokipos tokens gain inline `dark:` suffixes — one constant per token, no component edits needed.
