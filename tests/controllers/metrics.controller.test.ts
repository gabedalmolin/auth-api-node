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

  it("returns 401 when metrics auth is configured and the bearer token is missing", async () => {
    vi.doMock("../../src/metrics/authMetrics", () => ({
      metricsEnabled: true,
      metricsContentType: "text/plain; version=0.0.4; charset=utf-8",
      renderMetrics: vi.fn(),
    }));

    vi.doMock("../../src/config/env", () => ({
      env: {
        METRICS_AUTH_TOKEN: "metrics-auth-token",
      },
    }));

    const { metrics } = await import("../../src/controllers/metricsController");
    const response = createResponse();

    await metrics(
      {
        correlationId: "req-123",
        header: vi.fn(() => undefined),
      } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "METRICS_AUTHORIZATION_REQUIRED",
        message: "metrics authorization is required",
        correlationId: "req-123",
      },
    });
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

    vi.doMock("../../src/config/env", () => ({
      env: {
        METRICS_AUTH_TOKEN: "metrics-auth-token",
      },
    }));

    const { metrics } = await import("../../src/controllers/metricsController");
    const response = createResponse();

    await metrics(
      {
        header: vi.fn((name: string) =>
          name.toLowerCase() === "authorization"
            ? "Bearer metrics-auth-token"
            : undefined,
        ),
      } as never,
      response as never,
    );

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
