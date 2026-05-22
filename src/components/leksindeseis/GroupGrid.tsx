"use client";

// GroupGrid — the main 4×4 grid of word cards + solved category bars.

import { CategoryReveal } from "./CategoryReveal";
import type { ConnectionGroup } from "@/games/leksindeseis/types";
import { WordCard } from "./WordCard";

interface GroupGridProps {
  displayOrder:     string[];
  currentSelection: string[];
  solvedGroups:     ConnectionGroup[];
  disabled:         boolean;
  onSelect:         (word: string) => void;
}

export function GroupGrid({
  displayOrder,
  currentSelection,
  solvedGroups,
  disabled,
  onSelect,
}: GroupGridProps) {
  return (
    <div className="w-full flex flex-col gap-2" data-testid="group-grid">
      {/* Solved groups appear first, in order of solving */}
      {solvedGroups.map((group) => (
        <CategoryReveal key={group.category} group={group} />
      ))}

      {/* Remaining unsolved words in a 4-column grid */}
      {displayOrder.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {displayOrder.map((word) => (
            <WordCard
              key={word}
              word={word}
              selected={currentSelection.includes(word)}
              disabled={disabled}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
