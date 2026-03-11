#!/usr/bin/env bash

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <base-url>"
  exit 1
fi

base_url="${1%/}"

curl_json() {
  local path="$1"
  curl --fail --silent --show-error \
    --retry 12 \
    --retry-all-errors \
    --retry-delay 5 \
    "${base_url}${path}"
}

health_payload="$(curl_json "/health")"
ready_payload="$(curl_json "/ready")"
docs_payload="$(curl_json "/docs.json")"

node -e '
const health = JSON.parse(process.argv[1]);
if (health.status !== "ok" || health.service !== "auth-api") {
  console.error("Unexpected /health payload", health);
  process.exit(1);
}
' "$health_payload"

node -e '
const ready = JSON.parse(process.argv[1]);
if (ready.status !== "ready" || ready.service !== "auth-api") {
  console.error("Unexpected /ready payload", ready);
  process.exit(1);
}
' "$ready_payload"

node -e '
const spec = JSON.parse(process.argv[1]);
if (!spec.openapi || !spec.paths || Object.keys(spec.paths).length === 0) {
  console.error("Unexpected /docs.json payload");
  process.exit(1);
}
' "$docs_payload"

echo "Smoke validation passed for ${base_url}"
