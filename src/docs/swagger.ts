import { openApiSpec } from "../contracts/authContract";

export const LOCAL_SWAGGER_SERVER = {
  url: "http://localhost:3000",
  description: "Local server",
} as const;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

type SwaggerRequestLike = {
  protocol: string;
  get(name: string): string | undefined;
};

const getForwardedHeaderValue = (
  request: SwaggerRequestLike,
  name: string,
): string | undefined => {
  const value = request.get(name)?.trim();

  if (!value) {
    return undefined;
  }

  return value.split(",")[0]?.trim() || undefined;
};

export const resolveSwaggerBaseUrl = (
  request: SwaggerRequestLike,
): string => {
  const protocol =
    getForwardedHeaderValue(request, "x-forwarded-proto") ?? request.protocol;
  const host =
    getForwardedHeaderValue(request, "x-forwarded-host") ?? request.get("host");

  if (!host) {
    return LOCAL_SWAGGER_SERVER.url;
  }

  return `${protocol}://${host}`;
};

export const buildSwaggerSpec = (baseUrl: string = LOCAL_SWAGGER_SERVER.url) => {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl);
  const servers =
    normalizedBaseUrl === LOCAL_SWAGGER_SERVER.url
      ? [LOCAL_SWAGGER_SERVER]
      : [
          {
            url: normalizedBaseUrl,
            description: "Current server",
          },
          LOCAL_SWAGGER_SERVER,
        ];

  return {
    ...openApiSpec,
    servers,
  };
};

export default buildSwaggerSpec();
