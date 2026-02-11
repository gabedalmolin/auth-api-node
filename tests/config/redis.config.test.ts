describe("redis config", () => {
  const originalEnv = process.env;

  const loadRedisConfig = ({ redisUrl = "", nodeEnv = "test", clientOverrides = {} } = {}) => {
    vi.resetModules();
    process.env = { ...originalEnv, NODE_ENV: nodeEnv, REDIS_URL: redisUrl };

    const listeners = new Map();

    const defaultClient = {
      status: "ready",
      on: vi.fn((event, handler) => {
        listeners.set(event, handler);
      }),
      disconnect: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
      connector: {
        stream: {
          destroyed: false,
          destroy: vi.fn(),
        },
      },
    };

    const client = { ...defaultClient, ...clientOverrides };
    const RedisMock = vi.fn(() => client);

    vi.doMock("ioredis", () => RedisMock);

    const redisConfig = require("../../src/config/redis.ts");

    return {
      redisConfig,
      RedisMock,
      client,
      getListener: (event) => listeners.get(event),
    };
  };

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("não inicializa redis quando REDIS_URL está vazio", async () => {
    const { redisConfig, RedisMock } = loadRedisConfig({ redisUrl: "" });

    expect(redisConfig.redisEnabled).toBe(false);
    expect(redisConfig.redisClient).toBeNull();
    expect(RedisMock).not.toHaveBeenCalled();

    await expect(redisConfig.closeRedisConnection()).resolves.toBeUndefined();
  });

  it("loga erro fora de test", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getListener } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      nodeEnv: "production",
    });

    const onError = getListener("error");
    expect(typeof onError).toBe("function");
    onError(new Error("redis down"));

    expect(consoleSpy).toHaveBeenCalledWith("[redis] connection error:", "redis down");
  });

  it("não loga erro em test", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getListener } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      nodeEnv: "test",
    });

    const onError = getListener("error");
    expect(typeof onError).toBe("function");
    onError(new Error("redis down"));

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("retorna cedo quando status é end", async () => {
    const { redisConfig, client } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      clientOverrides: { status: "end" },
    });

    await redisConfig.closeRedisConnection();

    expect(client.quit).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("força disconnect quando status não é ready", async () => {
    const { redisConfig, client } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      nodeEnv: "test",
      clientOverrides: { status: "connecting" },
    });

    await redisConfig.closeRedisConnection();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.connector.stream.destroy).toHaveBeenCalledTimes(1);
  });

  it("não destrói stream já destruído", async () => {
    const stream = { destroyed: true, destroy: vi.fn() };

    const { redisConfig, client } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      nodeEnv: "test",
      clientOverrides: {
        status: "connecting",
        connector: { stream },
      },
    });

    await redisConfig.closeRedisConnection();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(stream.destroy).not.toHaveBeenCalled();
  });

  it("usa quit quando status é ready", async () => {
    const { redisConfig, client } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      clientOverrides: { status: "ready" },
    });

    await redisConfig.closeRedisConnection();

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("faz fallback para disconnect quando quit falha", async () => {
    const { redisConfig, client } = loadRedisConfig({
      redisUrl: "redis://localhost:6379",
      nodeEnv: "test",
      clientOverrides: {
        status: "ready",
        quit: vi.fn().mockRejectedValue(new Error("quit failed")),
      },
    });

    await redisConfig.closeRedisConnection();

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.connector.stream.destroy).toHaveBeenCalledTimes(1);
  });
});
