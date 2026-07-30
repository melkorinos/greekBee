"use client";

// ProfileToggleButton — the header 👤 entry point to /profile, as a toggle.
//
// From any page it opens /profile; while already on /profile it returns to the page
// you came from (router.back()). The decision is pure (resolveProfileNav); this
// component only reads the current path + whether there's in-app history to pop, and
// drives the router. App Router stamps window.history.state.idx — 0 on a fresh
// deep-load, > 0 once you've navigated within the app — which is exactly the
// "can I go back without leaving the site?" signal the fallback needs.

import { usePathname, useRouter } from "next/navigation";

import { resolveProfileNav } from "@/lib/profileNav";

export function ProfileToggleButton() {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick() {
    const idx =
      typeof window !== "undefined"
        ? (window.history.state?.idx as number | undefined) ?? 0
        : 0;
    const action = resolveProfileNav(pathname, idx > 0);
    if (action.kind === "back") {
      router.back();
    } else {
      router.push(action.href);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Το προφίλ μου"
      className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface-raised active:bg-border transition-colors text-base leading-none"
    >
      👤
    </button>
  );
}
