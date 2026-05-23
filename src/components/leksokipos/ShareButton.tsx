"use client";

// ShareButton — copies the current page URL to the clipboard so players can
// share a custom puzzle with friends.
// Used only in the /leksokipos/[center]/[outer] route for now.

import { useCallback, useState } from "react";

type CopyState = "idle" | "copied" | "error";

interface ShareButtonProps {
  /**
   * Canonical path (e.g. `/leksokipos/α/βγδεζη`) built from the normalised
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

  const tooltip: Record<CopyState, string> = {
    idle:   "Κοινοποίηση",
    copied: "Αντιγράφηκε!",
    error:  "Σφάλμα",
  };

  const style: Record<CopyState, string> = {
    idle:   "border-stone-300 text-stone-600 hover:bg-stone-100 active:bg-stone-200",
    copied: "border-green-400 text-green-600 bg-green-50",
    error:  "border-red-400   text-red-600   bg-red-50",
  };

  // Icon: share arrow (box with upward arrow) — rendered as inline SVG so it
  // looks identical on every platform, unlike Unicode share glyphs.
  const icon =
    copyState === "copied" ? (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
        <polyline points="3 8 7 12 13 4" />
      </svg>
    ) : copyState === "error" ? (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4" aria-hidden>
        <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
      </svg>
    ) : (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
        <path d="M10 3 L13 3 L13 6" />
        <line x1="7" y1="9" x2="13" y2="3" />
        <path d="M7 4 H3 a1 1 0 0 0 -1 1 v7 a1 1 0 0 0 1 1 h7 a1 1 0 0 0 1 -1 v-4" />
      </svg>
    );

  return (
    <div className="relative group">
      <button
        data-testid="btn-share"
        onClick={handleClick}
        className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${style[copyState]}`}
        aria-label={tooltip[copyState]}
      >
        {icon}
      </button>
      <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {tooltip[copyState]}
      </div>
    </div>
  );
}
