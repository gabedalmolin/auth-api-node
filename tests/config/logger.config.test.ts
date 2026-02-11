describe("logger config", () => {
  const originalEnv = process.env;
  const loggerConfigPath = require.resolve("../../src/logger.ts");

  const loadLogger = (env: Record<string, string | undefined>) => {
    vi.resetModules();
    process.env = { ...originalEnv, ...env };
    delete require.cache[loggerConfigPath];

    const loggerInstance = { info: vi.fn(), error: vi.fn() };
    const pinoMock = vi.fn(() => loggerInstance);
    vi.doMock("pino", () => pinoMock);

    const logger = require(loggerConfigPath);
    return { logger, pinoMock, loggerInstance };
  };

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("usa level silent em test quando LOG_LEVEL não está definido", () => {
    const { logger, pinoMock, loggerInstance } = loadLogger({
      NODE_ENV: "test",
      LOG_LEVEL: undefined,
    });

    expect(logger).toBe(loggerInstance);
    expect(pinoMock).toHaveBeenCalledWith({
      level: "silent",
      transport: undefined,
    });
  });

  it("usa pretty transport em development", () => {
    const { pinoMock } = loadLogger({
      NODE_ENV: "development",
      LOG_LEVEL: undefined,
    });

    expect(pinoMock).toHaveBeenCalledWith({
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
    });
  });

  it("prioriza LOG_LEVEL explícito", () => {
    const { pinoMock } = loadLogger({
      NODE_ENV: "test",
      LOG_LEVEL: "debug",
    });

    expect(pinoMock).toHaveBeenCalledWith({
      level: "debug",
      transport: undefined,
    });
  });
});
