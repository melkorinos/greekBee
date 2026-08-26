"use client";

// The Sound Cue on/off preference (ADR 0021) — cloned from useTheme, because it
// is the same kind of value: a Platform display preference that lives standalone
// in localStorage, OUTSIDE the `wordgames:state` envelope, and must stay in step
// across tabs. Deliberately NOT routed through useGameStore.

import { useSyncExternalStore } from "react";

import { SOUND_PREFERENCE_KEY as KEY } from "@/config/sound";

// ON unless the player explicitly stored "off". The default flipped on 2026-08-26
// when the header toggle was removed: with no control on screen, opt-in meant the
// one surviving Cue could never be heard by anybody. A stored "off" from before
// the removal is still honoured — the preference outlives its button, so bringing
// the toggle back restores that player's choice rather than overriding it.
function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

// Module-level listener set — notified on toggle and on storage events from other tabs.
const soundListeners = new Set<() => void>();

function subscribeSound(callback: () => void): () => void {
  soundListeners.add(callback);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) callback(); };
  window.addEventListener("storage", onStorage);
  return () => {
    soundListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSoundEnabled() {
  // Server snapshot is true, which is also the default → server and initial
  // client render agree, so there is no hydration mismatch by construction.
  // Nothing renders from this value today (the header toggle is gone), but the
  // snapshot stays honest so a restored toggle cannot flash the wrong icon.
  const soundEnabled = useSyncExternalStore(subscribeSound, readStored, () => true);

  function toggle() {
    const next = !soundEnabled;
    localStorage.setItem(KEY, next ? "on" : "off");
    soundListeners.forEach((fn) => fn());
  }

  return { soundEnabled, toggle };
}
