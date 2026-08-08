"use client";

// HeaderIconButton — the one circular, bordered icon button used in every
// game's header row (help, leaderboard, share, variant toggle, …). Pair the
// emoji/icon child with an optional hover tooltip; sizing/border come from
// the btnHeaderIcon recipe so every header button matches across games.

import { btnHeaderIcon, btnHeaderIconSize, tooltipBubble } from "@/styles/recipes";

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
        <div className={tooltipBubble}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
