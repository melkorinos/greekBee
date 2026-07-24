"use client";

// Shell — shared layout wrapper for all game screens.
// Provides a sticky header with the platform name, a theme toggle, and a
// hamburger button that opens a slide-out drawer listing all available games.

import { GAME_REGISTRY } from "@/config/games";
import { PLATFORM_NAME } from "@/config/platform";
import { FeedbackModal } from "./FeedbackModal";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";

// ── Hamburger icon ────────────────────────────────────────────────────────────
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="18" y2="18" />
          <line x1="18" y1="4" x2="4" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6"  x2="19" y2="6"  />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </>
      )}
    </svg>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
interface ShellProps {
  children: React.ReactNode;
}

// Games shown in the main nav section; leksikastirio is in its own community section.
const GAME_IDS      = ["leksokipos", "leksiarxeio", "leksindeseis", "vrestifrasi", "leksodromia", "leksoplegma", "stavrolekso", "topothesies", "posokanei"] as const;
const COMMUNITY_IDS = ["leksikastirio"] as const;

// Under-construction (wip) games move to their own drawer section, keeping the
// main list to finished games. Derived from the registry so a flag flip is enough.
const MAIN_GAME_IDS = GAME_IDS.filter((id) => !GAME_REGISTRY[id].wip);
const WIP_GAME_IDS  = GAME_IDS.filter((id) =>  GAME_REGISTRY[id].wip);

export function Shell({ children }: ShellProps) {
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const navLinkClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-200 font-medium hover:bg-zinc-700 active:bg-zinc-600 transition-colors";

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between max-w-game mx-auto">
          <Link
            href="/"
            className="text-sm font-semibold text-foreground hover:opacity-80 transition-colors"
          >
            🎮 {PLATFORM_NAME}
          </Link>

          <div className="flex items-center gap-1">
            {/* Profile — always-visible entry point to /profile */}
            <Link
              href="/profile"
              aria-label="Το προφίλ μου"
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface-raised active:bg-border transition-colors text-base leading-none"
            >
              👤
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface-raised active:bg-border transition-colors"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface-raised active:bg-border transition-colors"
            >
              <HamburgerIcon open={drawerOpen} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Slide-out drawer ──────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed top-0 right-0 z-50 h-full w-64 bg-zinc-900 border-l border-zinc-700 shadow-xl flex flex-col pt-16 pb-8 px-4"
            aria-label="Game navigation"
          >
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 px-2">
              Παιχνίδια
            </p>
            <ul className="space-y-1">
              {MAIN_GAME_IDS.map((id) => {
                const game = GAME_REGISTRY[id];
                return (
                  <li key={id}>
                    <Link
                      href={game.href}
                      onClick={() => setDrawerOpen(false)}
                      className={navLinkClass}
                    >
                      {game.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <hr className="my-4 border-zinc-700" />

            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 px-2">
              Κοινότητα
            </p>
            <ul className="space-y-1">
              {COMMUNITY_IDS.map((id) => {
                const game = GAME_REGISTRY[id];
                return (
                  <li key={id}>
                    <Link
                      href={game.href}
                      onClick={() => setDrawerOpen(false)}
                      className={navLinkClass}
                    >
                      {game.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {WIP_GAME_IDS.length > 0 && (
              <>
                <hr className="my-4 border-zinc-700" />

                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 px-2">
                  🚧 Υπό κατασκευή
                </p>
                <ul className="space-y-1">
                  {WIP_GAME_IDS.map((id) => {
                    const game = GAME_REGISTRY[id];
                    return (
                      <li key={id}>
                        <Link
                          href={game.href}
                          onClick={() => setDrawerOpen(false)}
                          className={navLinkClass}
                        >
                          {game.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <hr className="my-4 border-zinc-700" />

            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 px-2">
              Βοήθεια
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => { setDrawerOpen(false); setFeedbackOpen(true); }}
                  className={`${navLinkClass} w-full text-left`}
                >
                  💬 Σχόλια / Πρόβλημα
                </button>
              </li>
            </ul>
          </nav>
        </>
      )}

      {/* ── Feedback modal ────────────────────────────────────────────────── */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
