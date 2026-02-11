describe("prisma config", () => {
  const originalEnv = process.env;

  type GlobalPrismaState = typeof globalThis & {
    __authApiPool?: unknown;
    __authApiPrisma?: unknown;
  };

  const globalForPrisma = globalThis as GlobalPrismaState;

  const originalPool = globalForPrisma.__authApiPool;
  const originalPrisma = globalForPrisma.__authApiPrisma;

  const restoreGlobalState = () => {
    if (originalPool === undefined) {
      delete globalForPrisma.__authApiPool;
    } else {
      globalForPrisma.__authApiPool = originalPool;
    }

    if (originalPrisma === undefined) {
      delete globalForPrisma.__authApiPrisma;
    } else {
      globalForPrisma.__authApiPrisma = originalPrisma;
    }
  };

  const loadPrismaConfig = ({
    nodeEnv = "test",
    existingPool,
    existingPrisma,
    prismaInstance,
    poolInstance,
  }: {
    nodeEnv?: string;
    existingPool?: unknown;
    existingPrisma?: unknown;
    prismaInstance?: { $disconnect: () => Promise<void> };
    poolInstance?: { end: () => Promise<void> };
  } = {}) => {
    vi.resetModules();

    process.env = {
      ...originalEnv,
      NODE_ENV: nodeEnv,
      DATABASE_URL: "postgresql://user:pass@localhost:5432/auth_api",
    };

    if (existingPool !== undefined) {
      globalForPrisma.__authApiPool = existingPool;
    } else {
      delete globalForPrisma.__authApiPool;
    }

    if (existingPrisma !== undefined) {
      globalForPrisma.__authApiPrisma = existingPrisma;
    } else {
      delete globalForPrisma.__authApiPrisma;
    }

    const dotenvConfig = vi.fn();
    vi.doMock("dotenv", () => ({ config: dotenvConfig }));

    const resolvedPool =
      poolInstance ??
      ({
        end: vi.fn().mockResolvedValue(undefined),
      } as const);

    const Pool = vi.fn(() => resolvedPool);
    vi.doMock("pg", () => ({ Pool }));

    const adapterInstance = { name: "adapter" };
    const PrismaPg = vi.fn(() => adapterInstance);
    vi.doMock("@prisma/adapter-pg", () => ({ PrismaPg }));

    const resolvedPrisma =
      prismaInstance ??
      ({
        $disconnect: vi.fn().mockResolvedValue(undefined),
      } as const);

    const PrismaClient = vi.fn(() => resolvedPrisma);
    vi.doMock("@prisma/client", () => ({ PrismaClient }));

    const prismaModule = require("../../src/config/prisma.ts");
    const closePrismaConnection = prismaModule.closePrismaConnection;

    return {
      prismaModule,
      closePrismaConnection,
      mocks: {
        dotenvConfig,
        Pool,
        PrismaPg,
        PrismaClient,
        pool: resolvedPool,
        prisma: resolvedPrisma,
      },
    };
  };

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
    restoreGlobalState();
  });

  it("inicializa pool/prisma com env de teste e logs vazios", () => {
    const { prismaModule, mocks } = loadPrismaConfig({ nodeEnv: "test" });

    expect(mocks.dotenvConfig).toHaveBeenCalledWith({
      path: "tests/.env.test",
      override: false,
      quiet: true,
    });

    expect(mocks.Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://user:pass@localhost:5432/auth_api",
    });

    expect(mocks.PrismaPg).toHaveBeenCalledWith(mocks.pool);

    expect(mocks.PrismaClient).toHaveBeenCalledWith({
      adapter: { name: "adapter" },
      log: [],
    });

    expect(prismaModule).toBe(mocks.prisma);
  });

  it("usa .env e logs error/warn fora de test", () => {
    const { mocks } = loadPrismaConfig({ nodeEnv: "production" });

    expect(mocks.dotenvConfig).toHaveBeenCalledWith({
      path: ".env",
      override: false,
      quiet: true,
    });

    expect(mocks.PrismaClient).toHaveBeenCalledWith({
      adapter: { name: "adapter" },
      log: ["error", "warn"],
    });
  });

  it("reaproveita instâncias globais sem recriar Pool/PrismaClient", () => {
    const existingPool = { end: vi.fn().mockResolvedValue(undefined) };
    const existingPrisma = { $disconnect: vi.fn().mockResolvedValue(undefined) };

    const { prismaModule, mocks } = loadPrismaConfig({
      existingPool,
      existingPrisma,
    });

    expect(prismaModule).toBe(existingPrisma);
    expect(mocks.Pool).not.toHaveBeenCalled();
    expect(mocks.PrismaClient).not.toHaveBeenCalled();
  });

  it("closePrismaConnection ignora chamada concorrente (isClosing=true)", async () => {
    let resolveDisconnect: (() => void) | null = null;

    const prismaInstance = {
      $disconnect: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDisconnect = resolve;
          }),
      ),
    };

    const poolInstance = {
      end: vi.fn().mockResolvedValue(undefined),
    };

    const { closePrismaConnection } = loadPrismaConfig({
      prismaInstance,
      poolInstance,
    });

    const firstCall = closePrismaConnection();
    const secondCall = closePrismaConnection();

    expect(prismaInstance.$disconnect).toHaveBeenCalledTimes(1);

    resolveDisconnect?.();
    await Promise.all([firstCall, secondCall]);

    expect(poolInstance.end).toHaveBeenCalledTimes(1);
  });
});
