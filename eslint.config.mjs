import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright E2E files — not React code, React hooks rules don't apply
    "e2e/**",
    // Design spec sheets under .claude/aiHelper/html — throwaway Node scripts and
    // their generated HTML, never shipped and never imported by the app.
    ".claude/**",
  ]),
]);

export default eslintConfig;
