import type { LeksindeseisGroup } from "../types";

/** True when selection contains exactly the same words as the group (order-independent). */
export function matchesGroup(
  selection: string[],
  group: LeksindeseisGroup,
): boolean {
  if (selection.length !== group.words.length) return false;
  const sel = [...selection].sort();
  const grp = [...group.words].sort();
  return sel.every((w, i) => w === grp[i]);
}

/** True when selection shares exactly 3 words with the group. */
export function isOneAway(
  selection: string[],
  group: LeksindeseisGroup,
): boolean {
  return selection.filter((w) => group.words.includes(w)).length === 3;
}
