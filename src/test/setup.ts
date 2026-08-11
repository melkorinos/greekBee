// Global test setup — runs before every test file.
// Extends Vitest's expect with @testing-library/jest-dom matchers
// e.g. toBeInTheDocument(), toHaveTextContent(), toBeVisible()

import "@testing-library/jest-dom";

import { beforeEach, vi } from "vitest";

// jsdom doesn't implement scrollIntoView; components that keep an active row in
// view (e.g. GuessAutocomplete) call it on every highlight change. Stub it so
// those interactions don't throw under test.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom doesn't implement HTMLMediaElement.play either; the Sound Cue hook calls
// it on every Cue (ADR 0021). Unlike scrollIntoView above this stub CANNOT be
// guarded on absence — jsdom defines play(), it just logs "Not implemented" and
// returns undefined instead of the Promise a real browser gives you. So assign
// unconditionally, and resolve, so the hook's promise handling is exercised.
HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());

// Clear localStorage before every test so useRoundPersistence never
// restores state from a previous test into a freshly mounted component.
beforeEach(() => {
  localStorage.clear();
});
