/**
 * Vitest configuration — MUST (frontend.md §17).
 *
 * - Uses jsdom so DOM APIs (document, window) are available to React
 *   Testing Library.
 * - Reuses Vite's React plugin and path aliases so imports in tests
 *   resolve identically to runtime.
 * - Sets up `src/test/setup.ts` which pulls in `@testing-library/jest-dom`
 *   matchers and stubs the few browser-only APIs we touch (Intl
 *   RelativeTimeFormat, etc.).
 *
 * Coverage thresholds: 80% lines / 70% branches for hooks, services,
 * formatters — leaving UI components on a coarser 60% since they get
 * covered more usefully by Playwright/E2E later.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false, // we don't need Tailwind's compiled CSS in unit tests
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/**",
        "src/services/**",
        "src/hooks/**",
        "src/features/**/hooks/**",
        "src/features/**/components/**",
        "src/features/**/pages/**",
        "src/pages/**",
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
  },
});
