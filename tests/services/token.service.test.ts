import { describe, expect, it } from "vitest";
import AppError from "../../src/errors/AppError";
import tokenService from "../../src/services/tokenService";

describe("tokenService", () => {
  it("issues and verifies access tokens with the expected claims", () => {
    const accessToken = tokenService.issueAccessToken({
      userId: 10,
      sessionId: "4f1a5bd2-4c14-44f8-b0a0-5ce1d9ca1010",
    });

    const identity = tokenService.verifyAccessToken(accessToken.token);

    expect(identity).toEqual({
      userId: 10,
      sessionId: "4f1a5bd2-4c14-44f8-b0a0-5ce1d9ca1010",
      tokenJti: accessToken.tokenJti,
    });
  });

  it("rejects refresh tokens when verifying as access tokens", () => {
    const refreshToken = tokenService.issueRefreshToken({
      userId: 10,
      sessionId: "4f1a5bd2-4c14-44f8-b0a0-5ce1d9ca1010",
    });

    expect(() => tokenService.verifyAccessToken(refreshToken.token)).toThrowError(
      AppError,
    );
  });
});
