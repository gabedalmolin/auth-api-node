import { Counter, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "../config/env";

const registry = new Registry();

if (env.METRICS_ENABLED) {
  collectDefaultMetrics({
    prefix: "auth_api_runtime_",
    register: registry,
  });
}

const loginAttempts = new Counter({
  name: "auth_api_login_attempts_total",
  help: "Total login attempts by outcome.",
  labelNames: ["outcome"] as const,
  registers: [registry],
});

const refreshAttempts = new Counter({
  name: "auth_api_refresh_attempts_total",
  help: "Total refresh attempts by outcome.",
  labelNames: ["outcome"] as const,
  registers: [registry],
});

const refreshReplayDetections = new Counter({
  name: "auth_api_refresh_replay_detections_total",
  help: "Total refresh replay detections that compromised a session.",
  registers: [registry],
});

const rateLimitHits = new Counter({
  name: "auth_api_rate_limit_hits_total",
  help: "Total rate-limit hits by bucket and backend mode.",
  labelNames: ["bucket", "mode"] as const,
  registers: [registry],
});

const readinessFailures = new Counter({
  name: "auth_api_readiness_failures_total",
  help: "Total readiness failures by dependency.",
  labelNames: ["dependency"] as const,
  registers: [registry],
});

export const metricsEnabled = env.METRICS_ENABLED;
export const metricsContentType = registry.contentType;

export const authMetrics = {
  recordLogin(outcome: "success" | "invalid_credentials") {
    loginAttempts.inc({ outcome });
  },
  recordRefresh(
    outcome:
      | "success"
      | "invalid_token"
      | "expired"
      | "session_compromised"
      | "session_revoked"
      | "replay_detected",
  ) {
    refreshAttempts.inc({ outcome });
  },
  recordRefreshReplay() {
    refreshReplayDetections.inc();
  },
  recordRateLimitHit(bucket: string, mode: "redis" | "memory") {
    rateLimitHits.inc({ bucket, mode });
  },
  recordReadinessFailure(dependency: "database" | "redis") {
    readinessFailures.inc({ dependency });
  },
};

export async function renderMetrics(): Promise<string> {
  return registry.metrics();
}

export function resetMetrics(): void {
  registry.resetMetrics();
}
