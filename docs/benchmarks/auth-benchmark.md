# Auth Benchmark Report

This document captures the reproducible load benchmark for the core auth lifecycle.

## Scope

The benchmark exercises:

- user registration
- session creation
- authenticated profile fetch
- refresh-token rotation
- refresh replay rejection

## Reproduction

Run the benchmark stack with Docker Compose:

```bash
npm run prisma:migrate:deploy
docker compose -f docker-compose.yml -f docker-compose.benchmark.yml up --build --abort-on-container-exit --exit-code-from k6 k6
```

The `k6` summary JSON is written to:

- `tests/load/results/auth-benchmark-summary.json`

## Scenario profile

- `session_lifecycle`: `5` VUs for `20s`
- `refresh_replay`: `5` VUs with `25` iterations after a `2s` delay

## Environment

- Application stack: Docker Compose (`app`, PostgreSQL 16, Redis 7)
- Runtime: Node.js 20 in the project Docker image
- Load generator: `grafana/k6:0.49.0`
- Benchmark-only override: `RATE_LIMIT_MAX_REQUESTS=1000000` to avoid measuring the local abuse-control ceiling instead of the auth lifecycle
- Metrics threshold gates:
  - `http_req_failed < 1%`
  - `p95(http_req_duration{expected_response:true}) < 750ms`
  - `p99(http_req_duration{expected_response:true}) < 1200ms`

## Results

Latest recorded run:

- Executed on March 11, 2026
- Total iterations: `175`
- Total HTTP requests: `650`
- Aggregate request throughput: `24.48 req/s`
- Aggregate iteration throughput: `6.59 iter/s`
- Average request latency: `270.71ms`
- `p95` request latency: `709.97ms`
- `p99` request latency: `1023.93ms`
- Check pass rate: `100%` (`1050/1050`)
- Threshold result: pass

Scenario notes:

- `session_lifecycle` completed `50` full register/login/profile loops with `5` VUs across `20s`
- `refresh_replay` completed `125` replay-detection iterations with `5` VUs across `24.5s`

Interpretation:

- The service remained functionally correct throughout the run, including refresh replay rejection under concurrent auth traffic.
- The local container baseline stayed under the benchmark gates, but it is not a production capacity claim.
- This report is intended as reproducible proof of performance discipline for the repository, not as formal certification.
