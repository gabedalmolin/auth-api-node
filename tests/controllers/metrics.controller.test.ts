import { afterEach, describe, expect, it, vi } from "vitest";

const createResponse = () => {
  const response = {
    json: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
};

describe("metricsController", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 404 when metrics are disabled", async () => {
    vi.doMock("../../src/metrics/authMetrics", () => ({
      metricsEnabled: false,
      metricsContentType: "text/plain; version=0.0.4; charset=utf-8",
      renderMetrics: vi.fn(),
    }));

    const { metrics } = await import("../../src/controllers/metricsController");
    const response = createResponse();

    await metrics({} as never, response as never);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "metrics disabled" });
  });

  it("returns Prometheus metrics when enabled", async () => {
    const renderMetrics = vi
      .fn()
      .mockResolvedValue("# HELP auth_api_login_attempts_total Total login attempts.");

    vi.doMock("../../src/metrics/authMetrics", () => ({
      metricsEnabled: true,
      metricsContentType: "text/plain; version=0.0.4; charset=utf-8",
      renderMetrics,
    }));

    const { metrics } = await import("../../src/controllers/metricsController");
    const response = createResponse();

    await metrics({} as never, response as never);

    expect(response.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/plain; version=0.0.4; charset=utf-8",
    );
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(
      "# HELP auth_api_login_attempts_total Total login attempts.",
    );
  });
});
