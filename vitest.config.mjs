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
    pool: process.env.VITEST_POOL ?? "forks",
    maxWorkers: 1,
    server: {
      deps: {
        inline: [/\/src\//],
      },
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "json-summary"],
      all: false,
      extension: [".ts"],
    },
  },
});
