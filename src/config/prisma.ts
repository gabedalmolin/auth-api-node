import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

type GlobalPrismaState = typeof globalThis & {
  __authApiPool?: Pool;
  __authApiPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrismaState;
const prismaLog: ("error" | "warn")[] =
  env.NODE_ENV === "test" ? [] : ["error", "warn"];

if (!globalForPrisma.__authApiPool) {
  globalForPrisma.__authApiPool = new Pool({
    connectionString: env.DATABASE_URL,
  });
}

if (!globalForPrisma.__authApiPrisma) {
  globalForPrisma.__authApiPrisma = new PrismaClient({
    adapter: new PrismaPg(globalForPrisma.__authApiPool),
    log: prismaLog,
  });
}

const prisma = globalForPrisma.__authApiPrisma;
const pool = globalForPrisma.__authApiPool;

let isClosing = false;

export async function closePrismaConnection(): Promise<void> {
  if (isClosing) {
    return;
  }

  isClosing = true;

  await prisma.$disconnect();
  await pool.end();

  isClosing = false;
}

export default prisma;
