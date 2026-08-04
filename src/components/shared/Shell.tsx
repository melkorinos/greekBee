"use client";

// Shell — shared layout wrapper for all game screens.
// Provides a sticky header with the platform name, a theme toggle, and a
// hamburger button that opens a slide-out drawer listing all available games.

import { GAME_REGISTRY } from "@/config/games";
import { PLATFORM_NAME } from "@/config/platform";
import { FeedbackModal } from "./FeedbackModal";
import { Modal } from "./Modal";
import { ProfileToggleButton } from "./ProfileToggleButton";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { chipWarning } from "@/styles/recipes";

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
const GAME_IDS      = ["leksokipos", "leksiarxeio", "leksindeseis", "vrestifrasi", "leksodromia", "leksoplegma", "stavrolekso", "topothesies", "posokanei", "logopaignio"] as const;
const COMMUNITY_IDS = ["leksikastirio"] as const;

// Under-construction (wip) games move to their own drawer section, keeping the
// main list to finished games. Derived from the registry so a flag flip is enough.
const MAIN_GAME_IDS = GAME_IDS.filter((id) => !GAME_REGISTRY[id].wip);
const WIP_GAME_IDS  = GAME_IDS.filter((id) =>  GAME_REGISTRY[id].wip);

export function Shell({ children }: ShellProps) {
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [feedbackOpen,    setFeedbackOpen]    = useState(false);
  const [offlineHelpOpen, setOfflineHelpOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const {
    active: offlineActive,
    preparing: offlinePreparing,
    activate: activateOffline,
    deactivate: deactivateOffline,
  } = useOfflineMode();

  // Leaving this page while offline ends the round: every page is force-dynamic, so
  // without a connection it cannot load — and that includes the "prefetched" games,
  // since a dynamic route's payload is not served from cache (verified 2026-08-03,
  // e2e/offlineMode.spec.ts). So EVERY in-app link is confirmed while Offline Mode is
  // on, not just the ones outside the offline set. When a real caching mechanism lands
  // and cross-game navigation becomes safe again, this takes an href once more and
  // exempts `isOfflineRoute(href)` — the hook still exports it for that.
  const guardNavigation = useCallback(
    () => (e: React.MouseEvent) => {
      if (!offlineActive) {
        setDrawerOpen(false);
        return;
      }
      const leave = window.confirm(
        "Είσαι σε λειτουργία εκτός σύνδεσης. Αν φύγεις από εδώ χωρίς σύνδεση, ο γύρος σου χάνεται. Να συνεχίσω;",
      );
      if (!leave) {
        e.preventDefault();
        return;
      }
      setDrawerOpen(false);
    },
    [offlineActive],
  );

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
            onClick={guardNavigation()}
            className="text-sm font-semibold text-foreground hover:opacity-80 transition-colors"
          >
            🎮 {PLATFORM_NAME}
          </Link>

          <div className="flex items-center gap-1">
            {/* Profile — toggle: opens /profile, and while on /profile returns you
                to the page you came from (ProfileToggleButton). */}
            <ProfileToggleButton />

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
                      onClick={guardNavigation()}
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
                      onClick={guardNavigation()}
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
                          onClick={guardNavigation()}
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

            {/* Offline Mode — a platform-wide switch, so it lives here beside the
                theme toggle rather than in any game's chrome. The rules live behind
                the ? rather than in a permanent warning block: the drawer is a nav
                surface, and a wall of red text on every open reads as an error. */}
            <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Σύνδεση
              </p>
              <button
                onClick={() => setOfflineHelpOpen(true)}
                aria-label="Τι είναι η λειτουργία εκτός σύνδεσης;"
                className="flex items-center justify-center w-5 h-5 rounded-full border border-zinc-600 text-zinc-400 text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                ?
              </button>
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    void (offlineActive ? deactivateOffline() : activateOffline());
                  }}
                  disabled={offlinePreparing}
                  role="switch"
                  aria-checked={offlineActive}
                  aria-label="Λειτουργία εκτός σύνδεσης"
                  className={`${navLinkClass} w-full justify-between disabled:opacity-50`}
                >
                  <span>Εκτός σύνδεσης</span>
                  {/* Track + knob: a plain switch, so the control reads as a state
                      rather than as an action with a decorative icon. */}
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      offlineActive ? "bg-success" : "bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        offlineActive ? "translate-x-[1.125rem]" : "translate-x-[0.1875rem]"
                      }`}
                    />
                  </span>
                </button>
              </li>
            </ul>

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

      {/* ── Offline Mode help ─────────────────────────────────────────────── */}
      {/* The browser's refresh dialog cannot be worded, so this is the only place a
          player can learn the rules before they act on them. */}
      <Modal
        isOpen={offlineHelpOpen}
        onClose={() => setOfflineHelpOpen(false)}
        closeLabel="Κλείσιμο"
        ariaLabel="Τι είναι η λειτουργία εκτός σύνδεσης"
      >
        <div className="p-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Λειτουργία εκτός σύνδεσης
          </h2>
          <div className="space-y-3 text-sm text-muted leading-relaxed">
            <p>
              Προστατεύει τον γύρο που παίζεις όταν χάσεις το δίκτυο — π.χ. σε αεροπλάνο,
              τούνελ ή με κακό σήμα.
            </p>
            <p>
              <strong className="text-foreground">Ενεργοποίησέ τη ΟΣΟ ΕΧΕΙΣ ΣΥΝΔΕΣΗ</strong>,
              μέσα στο παιχνίδι που θέλεις να παίξεις. Όσο είναι ενεργή, μπλοκάρονται οι
              κατά λάθος ανανεώσεις της σελίδας και το σκορ σου φυλάσσεται στη συσκευή.
            </p>
            <p>
              Μόλις ξαναβρείς σύνδεση, απενεργοποίησέ τη για να σταλεί το σκορ σου στην
              κατάταξη.
            </p>
            <p className={`${chipWarning} rounded-lg px-3 py-2`}>
              Η αλλαγή παιχνιδιού χωρίς δίκτυο <strong>ΔΕΝ υποστηρίζεται</strong>. Μείνε
              στη σελίδα του παιχνιδιού σου — αν φύγεις ή κάνεις ανανέωση χωρίς σύνδεση,
              η σελίδα δεν ξαναφορτώνει και ο γύρος χάνεται.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Feedback modal ────────────────────────────────────────────────── */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
