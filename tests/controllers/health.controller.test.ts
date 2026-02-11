jest.mock("../../src/config/prisma.ts", () => ({
  $queryRaw: vi.fn(),
}));

const prisma = require("../../src/config/prisma.ts");
const healthController = require("../../src/controllers/healthController.ts");

const createRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe("healthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("health retorna status ok", async () => {
    const res = createRes();

    await healthController.health({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        service: "auth-api",
        timestamp: expect.any(String),
      }),
    );
  });

  it("ready retorna 200 quando banco está disponível", async () => {
    prisma.$queryRaw.mockResolvedValue([1]);
    const res = createRes();

    await healthController.ready({}, res);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        database: "up",
        timestamp: expect.any(String),
      }),
    );
  });

  it("ready retorna 503 quando banco falha", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("db down"));
    const res = createRes();

    await healthController.ready({}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "not_ready",
        database: "down",
        timestamp: expect.any(String),
      }),
    );
  });
});
