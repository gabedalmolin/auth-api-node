#!/usr/bin/env bash

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <base-url>"
  exit 1
fi

base_url="${1%/}"
max_attempts="${SMOKE_MAX_ATTEMPTS:-36}"
retry_delay_seconds="${SMOKE_RETRY_DELAY_SECONDS:-5}"

case "${base_url}" in
  http://*|https://*)
    ;;
  *)
    echo "Expected a full base URL including scheme, for example: https://auth-api-production.up.railway.app" >&2
    exit 1
    ;;
esac

preview_payload() {
  printf '%s' "$1" | tr '\n' ' ' | cut -c1-240
}

curl_json() {
  local path="$1"
  local attempt=1
  local body_file
  local payload=""
  local status_code=""
  local curl_exit=0

  body_file="$(mktemp)"
  trap 'rm -f "${body_file}"' RETURN

  while [ "${attempt}" -le "${max_attempts}" ]; do
    curl_exit=0
    status_code="$(
      curl --silent --show-error \
        --location \
        --max-redirs 5 \
        --proto '=http,https' \
        --proto-redir '=https' \
        --connect-timeout 10 \
        --max-time 20 \
        --output "${body_file}" \
        --write-out '%{http_code}' \
        "${base_url}${path}"
    )" || curl_exit=$?

    payload="$(cat "${body_file}")"

    if [ "${curl_exit}" -eq 0 ]; then
      case "${payload}" in
        \{*|\[*)
          if [ "${status_code}" = "200" ]; then
            printf '%s' "${payload}"
            return 0
          fi
          ;;
      esac
    fi

    if [ "${attempt}" -lt "${max_attempts}" ]; then
      echo "Waiting for ${base_url}${path} (attempt ${attempt}/${max_attempts}, status=${status_code:-curl-error})" >&2
      sleep "${retry_delay_seconds}"
    fi

    attempt=$((attempt + 1))
  done

  echo "Expected JSON from ${base_url}${path}, but received status ${status_code:-curl-error} with payload: $(preview_payload "${payload}")" >&2
  exit 1
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
