"use client";

// useIsGodMode — is the dev-only god mode active for this page load?
//
// Activated by ?godmode=zzkdgr3 in the URL. Callers use it both to render the
// god-mode UI and to disable anything that would write test data to the DB
// (score submission, achievement posting).
//
// Read through useSyncExternalStore rather than useState: the server snapshot is
// always false, so the SSR HTML and the initial hydration render agree (god mode
// off) and React then reconciles to the real client value without a hydration
// mismatch. Reading window.location in a useState initializer would diverge from
// SSR (no window there) and mismatch.

import { useSyncExternalStore } from "react";

const GOD_MODE_PARAM = "godmode";
const GOD_MODE_TOKEN = "zzkdgr3";

// God mode never changes at runtime, so there is nothing to subscribe to.
// Module-level so its identity is stable across renders.
const subscribeNever = () => () => {};

const readFromUrl = () =>
  new URLSearchParams(window.location.search).get(GOD_MODE_PARAM) === GOD_MODE_TOKEN;

const serverSnapshot = () => false;

export function useIsGodMode(): boolean {
  return useSyncExternalStore(subscribeNever, readFromUrl, serverSnapshot);
}
