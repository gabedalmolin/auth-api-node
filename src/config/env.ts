import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { durationToMs } from "../utils/duration";

loadDotenv({ path: ".env", override: false, quiet: true });

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const durationString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      durationToMs(value);
      return true;
    } catch {
      return false;
    }
  }, "must use a supported duration format such as 15m, 7d, 60s, or 1000");

const optionalMetricsAuthToken = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(16, "METRICS_AUTH_TOKEN must have at least 16 characters").optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .trim()
    .min(32, "ACCESS_TOKEN_SECRET must have at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .trim()
    .min(32, "REFRESH_TOKEN_SECRET must have at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_IN: durationString.default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: durationString.default("7d"),
  JWT_ISSUER: z.string().trim().min(1).default("auth-api"),
  JWT_AUDIENCE: z.string().trim().min(1).default("auth-api-clients"),
  REDIS_URL: optionalString,
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z
    .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DOCS_ENABLED: booleanFromEnv.default(true),
  METRICS_ENABLED: booleanFromEnv.default(false),
  METRICS_AUTH_TOKEN: optionalMetricsAuthToken,
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = {
  ...parsedEnv.data,
  LOG_LEVEL:
    parsedEnv.data.LOG_LEVEL ??
    (parsedEnv.data.NODE_ENV === "test" ? "silent" : "info"),
} as const;

export type Env = typeof env;
