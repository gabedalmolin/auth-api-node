const prisma = require("../src/config/prisma.ts");
const { closePrismaConnection } = require("../src/config/prisma.ts");
const { closeRedisConnection } = require("../src/config/redis.ts");

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await closeRedisConnection();
  await closePrismaConnection();
});
