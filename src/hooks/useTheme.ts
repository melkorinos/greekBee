"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

const KEY = "theme-preference";

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "light";
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStored);

  // Apply class on mount (and after hydration).
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep class in sync with external storage changes (e.g. another tab).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return;
      const next: Theme = e.newValue === "dark" ? "dark" : "light";
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem(KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  return { theme, toggle };
}
