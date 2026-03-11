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

export const resolveSwaggerBaseUrl = (
  request: SwaggerRequestLike,
): string => {
  const host = request.get("host");

  if (!host) {
    return LOCAL_SWAGGER_SERVER.url;
  }

  return `${request.protocol}://${host}`;
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
