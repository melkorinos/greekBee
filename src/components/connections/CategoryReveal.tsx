// CategoryReveal — displays a correctly solved group as a coloured bar.

import type { ConnectionGroup } from "@/games/connections/types";

interface CategoryRevealProps {
  group: ConnectionGroup;
}

// Difficulty colours (1=amber, 2=green, 3=blue, 4=purple)
const DIFFICULTY_CLASSES: Record<number, string> = {
  1: "bg-amber-300  text-amber-900",
  2: "bg-green-400  text-green-900",
  3: "bg-blue-400   text-blue-900",
  4: "bg-purple-400 text-purple-900",
};

export function CategoryReveal({ group }: CategoryRevealProps) {
  const colours = DIFFICULTY_CLASSES[group.difficulty] ?? "bg-stone-300 text-stone-800";

  return (
    <div
      className={[
        "w-full rounded-lg p-3 flex flex-col items-center gap-1",
        colours,
      ].join(" ")}
      data-testid={`category-reveal-${group.difficulty}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
        {group.category}
      </p>
      <p className="text-sm font-bold">
        {group.words.join(" · ")}
      </p>
    </div>
  );
}
