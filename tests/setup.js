const prisma = require("../src/config/prisma");
const { closeRedisConnection } = require("../src/config/redis");

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await closeRedisConnection();
  await prisma.$disconnect();
});
