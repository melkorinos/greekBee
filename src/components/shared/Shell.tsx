"use client";

// Shell — shared layout wrapper for all game screens.
// Provides a sticky header with the platform name and a hamburger button
// that opens a slide-out drawer listing all available games.

import Link from "next/link";
import { useEffect } from "react";
import { useState } from "react";

const GAMES = [
  { id: "spelling-bee", label: "🍯 Spelling Bee",  href: "/spelling-bee" },
  { id: "wordle",       label: "🟩 Wordle GR",      href: "/wordle" },
  { id: "connections",  label: "🔗 Connections",    href: "/connections" },
] as const;

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
        // X icon when drawer is open
        <>
          <line x1="4" y1="4" x2="18" y2="18" />
          <line x1="18" y1="4" x2="4" y2="18" />
        </>
      ) : (
        // Three bars when drawer is closed
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

export function Shell({ children }: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-stone-800 bg-stone-900 px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <Link
            href="/"
            className="text-sm font-semibold text-stone-300 hover:text-white transition-colors"
          >
            🎮 Word Games
          </Link>
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            className="flex items-center justify-center w-9 h-9 rounded-full text-stone-400 hover:bg-stone-700 active:bg-stone-600 transition-colors"
          >
            <HamburgerIcon open={drawerOpen} />
          </button>
        </div>
      </header>

      {/* ── Slide-out drawer ──────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <nav
            className="fixed top-0 right-0 z-50 h-full w-64 bg-white shadow-xl flex flex-col pt-16 pb-8 px-4"
            aria-label="Game navigation"
          >
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4 px-2">
              Games
            </p>
            <ul className="space-y-1">
              {GAMES.map((game) => (
                <li key={game.id}>
                  <Link
                    href={game.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 font-medium hover:bg-stone-100 active:bg-stone-200 transition-colors"
                  >
                    {game.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
