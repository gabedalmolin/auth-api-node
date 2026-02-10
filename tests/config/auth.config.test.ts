describe("auth config", () => {
  const originalEnv = process.env;
  const authConfigPath = require.resolve("../../src/config/auth");

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete require.cache[authConfigPath];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws on startup when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;

    expect(() => {
      require(authConfigPath);
    }).toThrow("JWT_SECRET is required");
  });

  it("loads config when JWT_SECRET is present", () => {
    process.env.JWT_SECRET = "test-secret";

    const authConfig = require(authConfigPath);

    expect(authConfig.jwt.secret).toBe("test-secret");
    expect(authConfig.jwt.expiresIn).toBeDefined();
  });
});
