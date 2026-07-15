"use client";

// HeaderIconButton — the one circular, bordered icon button used in every
// game's header row (help, leaderboard, share, variant toggle, …). Pair the
// emoji/icon child with an optional hover tooltip; sizing/border come from
// the btnHeaderIcon recipe so every header button matches across games.

import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

interface HeaderIconButtonProps {
  onClick:     () => void;
  ariaLabel:   string;
  tooltip?:    string;
  /** Extra classes for icon sizing/weight (e.g. "text-trophy", "text-sm font-bold"). */
  className?:  string;
  testId?:     string;
  children:    React.ReactNode;
}

export function HeaderIconButton({
  onClick,
  ariaLabel,
  tooltip,
  className = "",
  testId,
  children,
}: HeaderIconButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        title={tooltip ?? ariaLabel}
        data-testid={testId}
        className={`${btnHeaderIconSize} ${btnHeaderIcon} ${className}`}
      >
        {children}
      </button>
      {tooltip && (
        <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverted px-2.5 py-1 text-xs text-inverted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}
