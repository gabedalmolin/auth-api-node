const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const path = process.env.NODE_ENV === "test" ? "tests/.env.test" : ".env";
require("dotenv").config({ path, override: false, quiet: true });

const prismaLog = process.env.NODE_ENV === "test" ? [] : ["error", "warn"];
const globalForPrisma = globalThis;

if (!globalForPrisma.__authApiPool) {
  globalForPrisma.__authApiPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

if (!globalForPrisma.__authApiPrisma) {
  globalForPrisma.__authApiPrisma = new PrismaClient({
    adapter: new PrismaPg(globalForPrisma.__authApiPool),
    log: prismaLog,
  });
}

const pool = globalForPrisma.__authApiPool;
const prisma = globalForPrisma.__authApiPrisma;

let isClosing = false;
async function closePrismaConnection() {
  if (isClosing) return;
  isClosing = true;

  await prisma.$disconnect();
  await pool.end();

  isClosing = false;
}

module.exports = prisma;
module.exports.closePrismaConnection = closePrismaConnection;
