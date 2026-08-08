"use client";

// Offline Mode (ADR 0010) — the platform-wide state behind the drawer toggle that
// lets a player deliberately go offline and keep playing the finished games.
//
// Warm start only: the player is ONLINE when they activate. Every game page is
// `force-dynamic`, so a page not already in memory cannot load without the server.
// That is why activation prefetches the offline routes while a connection still
// exists, and why a refresh is BLOCKED rather than merely warned about — offline,
// a refresh is unrecoverable and the round is gone.
//
// State lives in React context at the Shell layout level rather than in
// localStorage + `storage` events: `storage` does not fire in the originating tab,
// and a second localStorage writer would sit next to useGameStore, which the
// standing rule reserves as the only one. (The Offline Score Outbox is the
// documented exception — it is not game state. See lib/offlineOutbox.ts.)

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GAME_REGISTRY, type RegistryGameId } from "@/config/games";
import { flushOutbox, readOutbox } from "@/lib/offlineOutbox";
import { postScoreAwaitable } from "@/lib/postScore";

/**
 * Surfaces excluded from Offline Mode even though they are `wip:false`.
 *
 * Both are community surfaces whose content is fetched from Supabase per view, so a
 * prefetched route renders an empty shell rather than a playable round. Offline Mode
 * is otherwise derived from the registry, so flipping a real game's `wip` flag is
 * still enough to include it.
 */
const OFFLINE_EXCLUDED: readonly RegistryGameId[] = ["stavrolekso", "leksikastirio"];

/** The games Offline Mode prefetches and allows navigation between. */
export const OFFLINE_GAME_IDS: readonly RegistryGameId[] = (
  Object.keys(GAME_REGISTRY) as RegistryGameId[]
).filter((id) => !GAME_REGISTRY[id].wip && !OFFLINE_EXCLUDED.includes(id));

/** The routes prefetched on activation — also the set nav interception treats as safe. */
export const OFFLINE_GAME_HREFS: readonly string[] = OFFLINE_GAME_IDS.map(
  (id) => GAME_REGISTRY[id].href,
);

interface OfflineModeValue {
  /** True while Offline Mode is on: refresh is guarded and the day-change redirect is suppressed. */
  active:     boolean;
  /** True while activation prefetches are still in flight — the toggle must not report "ready" yet. */
  preparing:  boolean;
  /** Prefetch the offline routes, then turn the mode on. Resolves once prefetches settle. */
  activate:   () => Promise<void>;
  /** Turn the mode off and flush any pending Scores. Failed posts are kept and retried. */
  deactivate: () => Promise<void>;
  /** Whether a route is one of the prefetched offline games (navigation to it is not blocked). */
  isOfflineRoute: (href: string) => boolean;
}

const INACTIVE: OfflineModeValue = {
  active:         false,
  preparing:      false,
  activate:       async () => {},
  deactivate:     async () => {},
  isOfflineRoute: () => false,
};

const OfflineModeContext = createContext<OfflineModeValue | null>(null);

/** True when `href` targets one of the prefetched offline games. */
export function isOfflineRouteHref(href: string): boolean {
  const path = href.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
  return OFFLINE_GAME_HREFS.some((base) => path === base || path.startsWith(`${base}/`));
}

export function OfflineModeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [active,    setActive]    = useState(false);
  const [preparing, setPreparing] = useState(false);

  const flush = useCallback(
    () => flushOutbox((url, body) => postScoreAwaitable(url, body)),
    [],
  );

  // Safety net for "player forgot to deactivate": a pending Score is posted on the
  // next mount even if Offline Mode is off. Failed posts stay queued for the next try.
  const flushedOnMount = useRef(false);
  useEffect(() => {
    if (flushedOnMount.current) return;
    flushedOnMount.current = true;
    if (readOutbox().length === 0) return;
    void flush();
  }, [flush]);

  // A refresh or tab close while offline loses the round, so cancel the event and let
  // the browser show its own dialog. The custom string is ignored by modern browsers —
  // the real explanation lives in the drawer, before the player ever goes offline.
  useEffect(() => {
    if (!active) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

  const activate = useCallback(async () => {
    setPreparing(true);

    // `router.prefetch` is `(href, options?) => void` — it returns NOTHING, so it
    // cannot be awaited. Awaiting it resolved instantly and the toggle reported
    // "ready" before anything was cached. It is still called (it is what populates
    // the router cache when the route is cacheable at all) but it cannot be the
    // readiness signal.
    //
    // KNOWN LIMITATION (verified 2026-08-03, e2e/offlineMode.spec.ts): every game page
    // is `force-dynamic`, so its payload is NOT served from cache on navigation. Both
    // prefetch and an awaited `fetch` warm-up leave the route cold, and navigating to
    // it offline lands on the browser's connection-error page. Cross-game navigation
    // offline therefore DOES NOT WORK. The e2e spec is skipped, not deleted — it is
    // the acceptance test for whatever mechanism replaces this. See ADR 0010.
    for (const href of OFFLINE_GAME_HREFS) {
      // Best-effort and individually guarded: prefetch throws synchronously when the
      // network is already down, and one bad route must not abort the rest or leave
      // the toggle stuck in `preparing`.
      try {
        router.prefetch(href);
      } catch {
        // ignore — a cold route is the known limitation above, not a crash
      }
    }

    setPreparing(false);
    setActive(true);
  }, [router]);

  const deactivate = useCallback(async () => {
    setActive(false);
    await flush();
  }, [flush]);

  return (
    <OfflineModeContext.Provider
      value={{ active, preparing, activate, deactivate, isOfflineRoute: isOfflineRouteHref }}
    >
      {children}
    </OfflineModeContext.Provider>
  );
}

/**
 * Read Offline Mode state. Returns an inert "inactive" value outside a provider so a
 * consumer rendered in isolation (a game page under test, a stray surface) degrades to
 * normal online behaviour instead of throwing.
 */
export function useOfflineMode(): OfflineModeValue {
  return useContext(OfflineModeContext) ?? INACTIVE;
}
