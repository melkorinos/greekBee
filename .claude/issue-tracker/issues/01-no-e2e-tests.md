# No E2E tests

Status: ready-for-agent

All tests are unit (pure logic) or component-level (RTL). No Playwright or Cypress test covers a full browser session, including `localStorage` rehydration and the random puzzle navigation flow.

## Acceptance criteria

- At least one Playwright test covering the Leksokipos daily puzzle load → word submission → score update → page refresh → state rehydration flow.
- At least one Playwright test covering the Leksiarxeio length-switcher and a full guess cycle.
- CI runs E2E tests on every push.

## Comments
