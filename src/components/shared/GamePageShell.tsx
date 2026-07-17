// GamePageShell — the shared <main> frame for every game page.
//
// Owns the canonical page wrapper: the [data-game] hook (drives each game's
// accent tokens in globals.css), column centring, padding, and background.
// Purely presentational and server-component compatible — no "use client", no
// hooks — so the many server pages can render it directly.
//
// Restyling the frame of every game is now a one-file edit here. The column
// width comes from the --container-game token (max-w-game); see globals.css.

import type { ReactNode } from "react";
import type { RegistryGameId } from "@/config/games";

interface GamePageShellProps {
  /** Registered game id — emitted as [data-game] so the page picks up its accent. */
  gameId: RegistryGameId;
  children: ReactNode;
  /** Page-specific additions, appended to the canonical wrapper classes. */
  className?: string;
}

export function GamePageShell({ gameId, children, className }: GamePageShellProps) {
  return (
    <main
      data-game={gameId}
      className={`flex flex-1 flex-col items-center gap-2 px-4 pt-4 bg-background text-foreground${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </main>
  );
}
