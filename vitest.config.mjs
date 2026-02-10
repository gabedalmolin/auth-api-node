import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      "./tests/jest.env.js",
      "./tests/vitest.setup.mjs",
      "./tests/setup.js",
    ],
    include: ["tests/**/*.test.{js,ts}"],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    pool: "forks",
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{js,ts}"],
      exclude: ["src/server.js", "src/docs/**"],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
