"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const KEY = "theme-preference";

function readStored(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// Module-level listener set — notified on toggle and on storage events from other tabs.
const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void): () => void {
  themeListeners.add(callback);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) callback(); };
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  // Server snapshot always "light" → server and initial client render agree → no hydration mismatch.
  // Client snapshot reads localStorage → correct value after hydration.
  const theme = useSyncExternalStore(subscribeTheme, readStored, () => "light" as Theme);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
    themeListeners.forEach((fn) => fn());
  }

  return { theme, toggle };
}
