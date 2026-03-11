import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, pingRedis } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  pingRedis: vi.fn(),
}));

vi.mock("../../src/config/prisma", () => ({
  default: {
    $queryRaw: queryRaw,
  },
}));

vi.mock("../../src/config/redis", () => ({
  pingRedis,
}));

import { health, ready } from "../../src/controllers/healthController";

const createResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
};

describe("healthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns liveness information", async () => {
    const response = createResponse();

    await health({} as never, response as never);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", service: "auth-api" }),
    );
  });

  it("returns ready when dependencies are up", async () => {
    queryRaw.mockResolvedValue([1]);
    pingRedis.mockResolvedValue("up");
    const response = createResponse();

    await ready({} as never, response as never);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        dependencies: expect.objectContaining({ database: "up", redis: "up" }),
      }),
    );
  });

  it("returns not_ready when database query fails", async () => {
    queryRaw.mockRejectedValue(new Error("db down"));
    const response = createResponse();

    await ready({} as never, response as never);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "not_ready" }),
    );
  });
});
