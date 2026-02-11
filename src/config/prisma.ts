const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const path = process.env.NODE_ENV === "test" ? "tests/.env.test" : ".env";
require("dotenv").config({ path, override: false });

/**
 * PostgreSQL connection pool.
 * Explicit pool management is required in Prisma 7.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Prisma Client singleton.
 *
 * - Uses pg driver explicitly (Prisma 7+)
 * - Avoids multiple connections
 * - Centralizes database access
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ["error", "warn"],
});

module.exports = prisma;
