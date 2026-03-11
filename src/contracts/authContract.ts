import { toJSONSchema, z } from "zod";

const stripJsonSchemaMeta = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripJsonSchemaMeta);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (key === "$schema") {
      continue;
    }

    result[key] = stripJsonSchemaMeta(entry);
  }

  return result;
};

const openApiSchema = (schema: z.ZodTypeAny) =>
  stripJsonSchemaMeta(toJSONSchema(schema));

const isoDateString = z.string().datetime();

export const registerInputSchema = z.object({
  name: z.string().trim().min(2, "name must have at least 2 characters"),
  email: z.string().trim().email("email must be a valid email"),
  password: z
    .string()
    .min(8, "password must have at least 8 characters")
    .max(128, "password must have at most 128 characters"),
});

export const createSessionInputSchema = z.object({
  email: z.string().trim().email("email must be a valid email"),
  password: z.string().min(8, "password must have at least 8 characters"),
});

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().trim().min(1, "refreshToken is required"),
});

export const revokeCurrentSessionInputSchema = refreshTokenInputSchema;

export const sessionParamsSchema = z.object({
  sessionId: z.string().uuid("sessionId must be a valid uuid"),
});

export const userResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  createdAt: isoDateString,
});

export const sessionStatusSchema = z.enum(["ACTIVE", "REVOKED", "COMPROMISED"]);

export const sessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: sessionStatusSchema,
  createdAt: isoDateString,
  lastSeenAt: isoDateString.nullable(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  current: z.boolean(),
});

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userResponseSchema,
  session: sessionResponseSchema,
});

export const registerResponseSchema = z.object({
  user: userResponseSchema,
});

export const meResponseSchema = z.object({
  user: userResponseSchema,
  session: sessionResponseSchema,
});

export const sessionsListResponseSchema = z.object({
  sessions: z.array(sessionResponseSchema),
});

export const errorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
    correlationId: z.string(),
  }),
});

const jsonContent = (schema: z.ZodTypeAny) => ({
  "application/json": {
    schema: openApiSchema(schema),
  },
});

const errorResponses = {
  400: {
    description: "Bad request",
    content: jsonContent(errorResponseSchema),
  },
  401: {
    description: "Unauthorized",
    content: jsonContent(errorResponseSchema),
  },
  404: {
    description: "Not found",
    content: jsonContent(errorResponseSchema),
  },
  409: {
    description: "Conflict",
    content: jsonContent(errorResponseSchema),
  },
  429: {
    description: "Too many requests",
    content: jsonContent(errorResponseSchema),
  },
  500: {
    description: "Internal server error",
    content: jsonContent(errorResponseSchema),
  },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Auth API",
    version: "1.1.0",
    description:
      "Production-grade authentication API with first-class sessions, refresh-token rotation, and contract-driven documentation.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local server" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      RegisterInput: openApiSchema(registerInputSchema),
      CreateSessionInput: openApiSchema(createSessionInputSchema),
      RefreshTokenInput: openApiSchema(refreshTokenInputSchema),
      SessionParams: openApiSchema(sessionParamsSchema),
      User: openApiSchema(userResponseSchema),
      Session: openApiSchema(sessionResponseSchema),
      AuthResponse: openApiSchema(authResponseSchema),
      RegisterResponse: openApiSchema(registerResponseSchema),
      MeResponse: openApiSchema(meResponseSchema),
      SessionsListResponse: openApiSchema(sessionsListResponseSchema),
      ErrorResponse: openApiSchema(errorResponseSchema),
    },
  },
  paths: {
    "/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: jsonContent(registerInputSchema),
        },
        responses: {
          201: {
            description: "User created",
            content: jsonContent(registerResponseSchema),
          },
          ...errorResponses,
        },
      },
    },
    "/v1/auth/sessions": {
      post: {
        tags: ["Auth"],
        summary: "Create a new authenticated session",
        requestBody: {
          required: true,
          content: jsonContent(createSessionInputSchema),
        },
        responses: {
          200: {
            description: "Session created",
            content: jsonContent(authResponseSchema),
          },
          ...errorResponses,
        },
      },
      delete: {
        tags: ["Auth"],
        summary: "Revoke all sessions of the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: "All sessions revoked" },
          ...errorResponses,
        },
      },
      get: {
        tags: ["Auth"],
        summary: "List user sessions",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "User sessions",
            content: jsonContent(sessionsListResponseSchema),
          },
          ...errorResponses,
        },
      },
    },
    "/v1/auth/tokens/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new token pair",
        requestBody: {
          required: true,
          content: jsonContent(refreshTokenInputSchema),
        },
        responses: {
          200: {
            description: "Token pair rotated",
            content: jsonContent(authResponseSchema),
          },
          ...errorResponses,
        },
      },
    },
    "/v1/auth/sessions/current/revoke": {
      post: {
        tags: ["Auth"],
        summary: "Revoke the current session by refresh token",
        requestBody: {
          required: true,
          content: jsonContent(revokeCurrentSessionInputSchema),
        },
        responses: {
          204: { description: "Current session revoked" },
          ...errorResponses,
        },
      },
    },
    "/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the authenticated user and current session",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Authenticated user context",
            content: jsonContent(meResponseSchema),
          },
          ...errorResponses,
        },
      },
    },
    "/v1/auth/sessions/{sessionId}": {
      delete: {
        tags: ["Auth"],
        summary: "Revoke a specific session",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          204: { description: "Session revoked" },
          ...errorResponses,
        },
      },
    },
    "/health": {
      get: {
        tags: ["Operations"],
        summary: "Liveness probe",
        responses: {
          200: {
            description: "Service is alive",
          },
        },
      },
    },
    "/ready": {
      get: {
        tags: ["Operations"],
        summary: "Readiness probe",
        responses: {
          200: { description: "Service is ready" },
          503: { description: "Dependencies are not ready" },
        },
      },
    },
    "/metrics": {
      get: {
        tags: ["Operations"],
        summary: "Prometheus metrics endpoint",
        responses: {
          200: {
            description: "Prometheus text exposition for service metrics",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          404: { description: "Metrics endpoint disabled" },
        },
      },
    },
  },
} as const;
