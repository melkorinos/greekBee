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

// Clear localStorage before every test so useRoundPersistence never
// restores state from a previous test into a freshly mounted component.
beforeEach(() => {
  localStorage.clear();
});
