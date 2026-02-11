const { randomUUID, createHash } = require("node:crypto");

const refreshTokenRepo = require("../../src/repositories/refreshTokenRepository.ts");
const prisma = require("../../src/config/prisma.ts");

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RefreshTokenRepository", () => {
  it("deve criar um refresh token", async () => {
    const user = await prisma.user.create({
      data: { name: "John", email: "john@test.com", password: "123456" },
    });

    const tokenHash = hashToken("token123");

    const token = await refreshTokenRepo.create({
      tokenHash,
      jti: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 10000),
    });

    expect(token).toHaveProperty("id");
    expect(token.tokenHash).toBe(tokenHash);
  });

  it("não deve permitir tokenHash duplicado", async () => {
    const user = await prisma.user.create({
      data: { name: "John", email: "john@test.com", password: "123456" },
    });

    const duplicatedTokenHash = hashToken("duplicado");

    await refreshTokenRepo.create({
      tokenHash: duplicatedTokenHash,
      jti: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 10000),
    });

    await expect(
      refreshTokenRepo.create({
        tokenHash: duplicatedTokenHash,
        jti: randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 10000),
      }),
    ).rejects.toBeTruthy();
  });
});
