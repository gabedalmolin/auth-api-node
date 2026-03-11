import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { closePrismaConnection } from "../../src/config/prisma";
import { closeRedisConnection } from "../../src/config/redis";
import prisma from "../../src/config/prisma";

const integrationSuite =
  process.env.RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

const cleanup = async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
};

integrationSuite("Auth API integration", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await closeRedisConnection();
    await closePrismaConnection();
  });

  it("registers, logs in, and returns the authenticated profile", async () => {
    const registerResponse = await request(app).post("/v1/auth/register").send({
      name: "Gabri",
      email: "gabri@test.dev",
      password: "strong-pass-123",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe("gabri@test.dev");

    const sessionResponse = await request(app).post("/v1/auth/sessions").send({
      email: "gabri@test.dev",
      password: "strong-pass-123",
    });

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toHaveProperty("accessToken");
    expect(sessionResponse.body).toHaveProperty("refreshToken");
    expect(sessionResponse.body.session.current).toBe(true);

    const meResponse = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${sessionResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe("gabri@test.dev");
    expect(meResponse.body.session.current).toBe(true);
  });

  it("rotates refresh tokens and compromises the session on replay", async () => {
    await request(app).post("/v1/auth/register").send({
      name: "Gabri",
      email: "gabri+rotate@test.dev",
      password: "strong-pass-123",
    });

    const loginResponse = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+rotate@test.dev",
      password: "strong-pass-123",
    });

    const firstRefreshToken = loginResponse.body.refreshToken;
    const accessToken = loginResponse.body.accessToken;

    const refreshResponse = await request(app)
      .post("/v1/auth/tokens/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.refreshToken).not.toBe(firstRefreshToken);

    const replayResponse = await request(app)
      .post("/v1/auth/tokens/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.error.code).toBe("REFRESH_TOKEN_REUSED");

    const meResponse = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(401);
    expect(meResponse.body.error.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("lists and revokes sessions by public session identifier", async () => {
    await request(app).post("/v1/auth/register").send({
      name: "Gabri",
      email: "gabri+sessions@test.dev",
      password: "strong-pass-123",
    });

    const firstLogin = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+sessions@test.dev",
      password: "strong-pass-123",
    });
    const secondLogin = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+sessions@test.dev",
      password: "strong-pass-123",
    });

    const listResponse = await request(app)
      .get("/v1/auth/sessions")
      .set("Authorization", `Bearer ${firstLogin.body.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.sessions).toHaveLength(2);

    const targetSessionId = listResponse.body.sessions.find(
      (session: { current: boolean }) => !session.current,
    )?.sessionId;

    expect(targetSessionId).toBeTruthy();

    const revokeResponse = await request(app)
      .delete(`/v1/auth/sessions/${targetSessionId}`)
      .set("Authorization", `Bearer ${firstLogin.body.accessToken}`);

    expect(revokeResponse.status).toBe(204);

    const revokedSessionMe = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);

    expect(revokedSessionMe.status).toBe(401);
    expect(revokedSessionMe.body.error.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("revokes all sessions for the authenticated user", async () => {
    await request(app).post("/v1/auth/register").send({
      name: "Gabri",
      email: "gabri+all@test.dev",
      password: "strong-pass-123",
    });

    const firstLogin = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+all@test.dev",
      password: "strong-pass-123",
    });
    const secondLogin = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+all@test.dev",
      password: "strong-pass-123",
    });

    const revokeAllResponse = await request(app)
      .delete("/v1/auth/sessions")
      .set("Authorization", `Bearer ${firstLogin.body.accessToken}`);

    expect(revokeAllResponse.status).toBe(204);

    const meResponse = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${secondLogin.body.accessToken}`);

    expect(meResponse.status).toBe(401);
    expect(meResponse.body.error.code).toBe("SESSION_NOT_ACTIVE");
  });

  it("revokes the current session using the refresh token", async () => {
    await request(app).post("/v1/auth/register").send({
      name: "Gabri",
      email: "gabri+current@test.dev",
      password: "strong-pass-123",
    });

    const loginResponse = await request(app).post("/v1/auth/sessions").send({
      email: "gabri+current@test.dev",
      password: "strong-pass-123",
    });

    const revokeCurrentResponse = await request(app)
      .post("/v1/auth/sessions/current/revoke")
      .send({ refreshToken: loginResponse.body.refreshToken });

    expect(revokeCurrentResponse.status).toBe(204);

    const meResponse = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.status).toBe(401);
    expect(meResponse.body.error.code).toBe("SESSION_NOT_ACTIVE");
  });
});
