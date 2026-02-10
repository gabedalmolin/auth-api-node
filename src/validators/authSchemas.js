const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2, "name must have at least 2 characters"),
  email: z.string().trim().email("email must be a valid email"),
  password: z
    .string()
    .trim()
    .min(6, "password must have at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().email("email must be a valid email"),
  password: z
    .string()
    .trim()
    .min(6, "password must have at least 6 characters"),
});

const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, "refreshToken is required"),
});

const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1, "refreshToken is required"),
});

const logoutSessionSchema = z.object({
  jti: z.string().uuid("jti must be a valid uuid"),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  logoutSessionSchema,
};
