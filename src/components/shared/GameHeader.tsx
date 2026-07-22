// GameHeader — the shared title row for every game page.
//
// Single-sources the <h1> typography (text-2xl font-bold tracking-tight) and the
// title-row layout (a max-w-game flex row). Interactive controls — the 🏆
// leaderboard button, the ? help trigger, the Leksokipos variant toggle / share —
// arrive as children and sit in a right-aligned slot. Server-component
// compatible: the buttons are the client parts, passed in by a "use client"
// parent, while the row itself carries no interactivity of its own.

import type { ReactNode } from "react";

interface GameHeaderProps {
  /** Full title including its emoji, e.g. "🕸️ Leksoplegma". */
  title: string;
  /** Right-slot controls (trophy / help / toggle buttons). Omit for a bare title. */
  children?: ReactNode;
  /** Page-specific additions to the row (e.g. mx-auto inside a full-bleed bar). */
  className?: string;
}

export function GameHeader({ title, children, className }: GameHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between w-full max-w-game${
        className ? ` ${className}` : ""
      }`}
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
