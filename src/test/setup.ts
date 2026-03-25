// Global test setup — runs before every test file.
// Extends Vitest's expect with @testing-library/jest-dom matchers
// e.g. toBeInTheDocument(), toHaveTextContent(), toBeVisible()

import "@testing-library/jest-dom";

import { beforeEach } from "vitest";

// Clear localStorage before every test so usePersistence never
// restores state from a previous test into a freshly mounted component.
beforeEach(() => {
  localStorage.clear();
});
