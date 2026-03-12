# Observability Guide

This repository exposes a minimal Prometheus-compatible metrics surface focused on the critical auth lifecycle.

## What is instrumented

- login attempts by outcome
- refresh attempts by outcome
- refresh replay detections
- rate-limit hits by bucket and backend mode
- readiness failures by dependency

The metrics endpoint is disabled by default and must be enabled explicitly with `METRICS_ENABLED=true`.

For non-local environments, prefer one of these patterns:

- keep `/metrics` on a private network only
- set `METRICS_AUTH_TOKEN` and require a bearer token from the scraper

## Run the service with metrics enabled

Start the application locally with metrics exposed on `/metrics`:

```bash
METRICS_ENABLED=true npm run dev
```

If you want to exercise the authenticated path locally, provide a token:

```bash
METRICS_ENABLED=true METRICS_AUTH_TOKEN=local-observability-token npm run dev
```

If you are using the full local stack, ensure PostgreSQL and Redis are running first:

```bash
docker compose up -d postgres redis
```

## Start the local observability stack

The repository includes a ready-to-run Prometheus and Grafana stack:

```bash
docker compose -f deploy/observability/docker-compose.yml up -d
```

Service endpoints:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

Grafana provisions the Prometheus datasource automatically and loads the dashboard from:

- `deploy/observability/grafana/dashboards/auth-api-dashboard.json`

## Local workflow

1. start the API with `METRICS_ENABLED=true`
2. generate auth traffic locally or run the integration and load scenarios
3. open Grafana at `http://localhost:3001`
4. review the `Auth API Operational Overview` dashboard

## Metric names

- `auth_api_login_attempts_total`
- `auth_api_refresh_attempts_total`
- `auth_api_refresh_replay_detections_total`
- `auth_api_rate_limit_hits_total`
- `auth_api_readiness_failures_total`

The registry also exports a small set of default runtime metrics via `prom-client` when metrics are enabled.
