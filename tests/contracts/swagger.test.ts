import { describe, expect, it } from "vitest";
import swaggerSpec from "../../src/docs/swagger";

describe("swagger spec", () => {
  it("exposes non-empty paths for the v1 contract", () => {
    expect(Object.keys(swaggerSpec.paths)).not.toHaveLength(0);
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/register");
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/sessions");
    expect(swaggerSpec.paths).toHaveProperty("/v1/auth/tokens/refresh");
  });
});
