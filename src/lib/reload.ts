// reloadApp — hard-reload the current route.
//
// Disconnect (ADR 0012 §5) must leave the device a brand-new anonymous player.
// Rewriting the persistence envelope is not enough: mounted boards still hold
// the old identity's deviceId and in-progress session state in React memory,
// which could re-persist under the fresh identity. Only a reload guarantees
// every in-memory trace of the old identity dies.
//
// Lives in its own module so unit tests can mock it — jsdom cannot navigate.
export function reloadApp(): void {
  window.location.reload();
}
