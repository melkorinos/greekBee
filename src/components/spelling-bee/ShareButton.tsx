"use client";

// ShareButton — copies the current page URL to the clipboard so players can
// share a custom puzzle with friends.
// Used only in the /spelling-bee/[center]/[outer] route for now.

import { useCallback, useState } from "react";

type CopyState = "idle" | "copied" | "error";

interface ShareButtonProps {
  /**
   * Canonical path (e.g. `/spelling-bee/α/βγδεζη`) built from the normalised
   * letters server-side.  The full URL is assembled client-side by prepending
   * `window.location.origin` so the share link is always accent-free and absolute.
   * If omitted, falls back to `window.location.href` (e.g. for non-custom pages).
   */
  canonicalPath?: string;
}

export function ShareButton({ canonicalPath }: ShareButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleClick = useCallback(async () => {
    // Build an absolute URL from the canonical accent-free path.
    // Falling back to window.location.href is safe for non-custom pages.
    const target = canonicalPath
      ? `${window.location.origin}${canonicalPath}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(target);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [canonicalPath]);

  const label: Record<CopyState, string> = {
    idle: "Κοινοποίηση",
    copied: "✓ Αντιγράφηκε!",
    error: "Σφάλμα",
  };

  const style: Record<CopyState, string> = {
    idle: "border-stone-300 text-stone-700 hover:bg-stone-100 active:bg-stone-200",
    copied: "border-green-400 text-green-700 bg-green-50",
    error: "border-red-400 text-red-700 bg-red-50",
  };

  return (
    <button
      data-testid="btn-share"
      onClick={handleClick}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${style[copyState]}`}
      aria-label="Copy puzzle link to clipboard"
    >
      {label[copyState]}
    </button>
  );
}
