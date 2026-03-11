import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    pool: process.env.VITEST_POOL ?? "forks",
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/docs/**", "src/types/**"],
      extension: [".ts"],
    },
  },
});
