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

const isLocalHost = (host: string): boolean => {
  const normalizedHost = host.toLowerCase();

  return (
    normalizedHost.startsWith("localhost") ||
    normalizedHost.startsWith("127.0.0.1") ||
    normalizedHost.startsWith("[::1]")
  );
};

export const resolveSwaggerBaseUrl = (
  request: SwaggerRequestLike,
): string => {
  const requestedProtocol =
    getForwardedHeaderValue(request, "x-forwarded-proto") ?? request.protocol;
  const host =
    getForwardedHeaderValue(request, "x-forwarded-host") ?? request.get("host");

  if (!host) {
    return LOCAL_SWAGGER_SERVER.url;
  }

  // Public proxy platforms can forward traffic to the container over plain HTTP
  // even when the external URL is HTTPS. Prefer HTTPS for non-local hosts so
  // Swagger "Try it out" targets the public origin instead of an internal hop.
  const protocol =
    requestedProtocol === "http" && !isLocalHost(host)
      ? "https"
      : requestedProtocol;

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
