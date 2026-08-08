// profileNav.ts — the pure decision behind the header 👤 button's toggle (zero React).
//
// The button is a toggle: from anywhere it opens /profile; while already ON /profile
// it returns to the page you came from. "Came from" is the browser's own back stack
// (router.back()), so it naturally lands wherever you were — a game, the picker, a
// custom puzzle. The one case back() can't serve is a deep link or hard refresh that
// landed straight on /profile with no in-app history: there back() would leave the
// site, so we fall back to the home picker instead. The caller supplies `canGoBack`
// (App Router stamps window.history.state.idx, > 0 once you've navigated in-app).

export const PROFILE_PATH = "/profile";

/** What the toggle should do: pop the history stack, or navigate to a path. */
export type ProfileNavAction = { kind: "back" } | { kind: "push"; href: string };

export function resolveProfileNav(pathname: string, canGoBack: boolean): ProfileNavAction {
  if (pathname === PROFILE_PATH) {
    return canGoBack ? { kind: "back" } : { kind: "push", href: "/" };
  }
  return { kind: "push", href: PROFILE_PATH };
}
