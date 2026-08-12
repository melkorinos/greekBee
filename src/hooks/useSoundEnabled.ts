"use client";

// The Sound Cue on/off preference (ADR 0021) — cloned from useTheme, because it
// is the same kind of value: a Platform display preference that lives standalone
// in localStorage, OUTSIDE the `wordgames:state` envelope, and must stay in step
// across tabs. Deliberately NOT routed through useGameStore.

import { useSyncExternalStore } from "react";

import { SOUND_PREFERENCE_KEY as KEY } from "@/config/sound";

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
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
  // Server snapshot is false, which is also the default → server and initial
  // client render agree, so there is no hydration mismatch by construction.
  const soundEnabled = useSyncExternalStore(subscribeSound, readStored, () => false);

  function toggle() {
    const next = !soundEnabled;
    localStorage.setItem(KEY, next ? "on" : "off");
    soundListeners.forEach((fn) => fn());
  }

  return { soundEnabled, toggle };
}
