/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/jest.env.js", "<rootDir>/tests/jest.globals.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json", useESM: false }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/docs/**"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
