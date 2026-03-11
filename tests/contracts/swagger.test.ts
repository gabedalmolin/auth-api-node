import { describe, expect, it } from "vitest";
import {
  LOCAL_SWAGGER_SERVER,
  buildSwaggerSpec,
  resolveSwaggerBaseUrl,
} from "../../src/docs/swagger";

describe("swagger spec", () => {
  it("exposes non-empty paths for the v1 contract", () => {
    const swaggerSpec = buildSwaggerSpec();

    expect(Object.keys(swaggerSpec.paths)).not.toHaveLength(0);
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/register");
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/sessions");
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/tokens/refresh");
    expect(swaggerSpec.paths).toHaveProperty("/metrics");
  });

  it("uses the provided public server URL ahead of the local fallback", () => {
    const swaggerSpec = buildSwaggerSpec(
      "https://auth-api-production-a97b.up.railway.app/",
    );

    expect(swaggerSpec.servers).toEqual([
      {
        url: "https://auth-api-production-a97b.up.railway.app",
        description: "Current server",
      },
      LOCAL_SWAGGER_SERVER,
    ]);
  });

  it("derives the base URL from the incoming request", () => {
    const baseUrl = resolveSwaggerBaseUrl({
      protocol: "https",
      get(header: string) {
        return header === "host"
          ? "auth-api-production-a97b.up.railway.app"
          : undefined;
      },
    });

    expect(baseUrl).toBe("https://auth-api-production-a97b.up.railway.app");
  });

  it("prefers forwarded host and proto when present", () => {
    const baseUrl = resolveSwaggerBaseUrl({
      protocol: "http",
      get(header: string) {
        if (header === "x-forwarded-proto") {
          return "https, http";
        }

        if (header === "x-forwarded-host") {
          return "auth-api-production-a97b.up.railway.app, internal.railway";
        }

        if (header === "host") {
          return "internal.railway";
        }

        return undefined;
      },
    });

    expect(baseUrl).toBe("https://auth-api-production-a97b.up.railway.app");
  });

  it("prefers https for non-local public hosts when the proxy reports http", () => {
    const baseUrl = resolveSwaggerBaseUrl({
      protocol: "http",
      get(header: string) {
        return header === "host"
          ? "auth-api-production-a97b.up.railway.app"
          : undefined;
      },
    });

    expect(baseUrl).toBe("https://auth-api-production-a97b.up.railway.app");
  });

  it("falls back to the local server when the host header is unavailable", () => {
    const baseUrl = resolveSwaggerBaseUrl({
      protocol: "https",
      get() {
        return undefined;
      },
    });

    expect(baseUrl).toBe(LOCAL_SWAGGER_SERVER.url);
  });
});
