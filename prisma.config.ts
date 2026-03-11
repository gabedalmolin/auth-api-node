import "dotenv/config";
import { defineConfig } from "prisma/config";

const prismaConfig = process.env.DATABASE_URL
  ? {
      datasource: {
        url: process.env.DATABASE_URL,
      },
    }
  : {};

export default defineConfig(prismaConfig);
