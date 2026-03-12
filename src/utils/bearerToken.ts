export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const trimmed = authorization.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const separatorIndex = trimmed.indexOf(" ");
  if (separatorIndex === -1) {
    return null;
  }

  const scheme = trimmed.slice(0, separatorIndex);
  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  const token = trimmed.slice(separatorIndex + 1).trim();
  return token.length > 0 ? token : null;
}
