import http from "k6/http";
import { check, group, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://app:3000";
const password = "strong-pass-123";

http.setResponseCallback(http.expectedStatuses(200, 201, 401));

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  scenarios: {
    session_lifecycle: {
      executor: "constant-vus",
      exec: "sessionLifecycle",
      vus: 5,
      duration: "20s",
    },
    refresh_replay: {
      executor: "per-vu-iterations",
      exec: "refreshReplayLifecycle",
      vus: 5,
      iterations: 25,
      maxDuration: "30s",
      startTime: "2s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{expected_response:true}": [
      "p(95)<750",
      "p(99)<1200",
    ],
  },
};

const jsonHeaders = {
  headers: {
    "Content-Type": "application/json",
  },
};

function uniqueIdentity(prefix) {
  const id = `${prefix}-${__VU}-${__ITER}-${Date.now()}`;

  return {
    email: `${id}@benchmark.test`,
    name: `Bench ${id}`,
  };
}

function registerUser(identity) {
  return http.post(
    `${baseUrl}/v1/auth/register`,
    JSON.stringify({
      name: identity.name,
      email: identity.email,
      password,
    }),
    jsonHeaders,
  );
}

function loginUser(identity) {
  return http.post(
    `${baseUrl}/v1/auth/sessions`,
    JSON.stringify({
      email: identity.email,
      password,
    }),
    jsonHeaders,
  );
}

export function sessionLifecycle() {
  const identity = uniqueIdentity("session");

  group("register", () => {
    const response = registerUser(identity);

    check(response, {
      "register returns 201": (result) => result.status === 201,
    });
  });

  const loginResponse = group("login", () => {
    const response = loginUser(identity);

    check(response, {
      "login returns 200": (result) => result.status === 200,
      "login returns access token": (result) => Boolean(result.json("accessToken")),
      "login returns refresh token": (result) => Boolean(result.json("refreshToken")),
    });

    return response;
  });

  if (loginResponse.status !== 200) {
    return;
  }

  const accessToken = loginResponse.json("accessToken");

  group("profile", () => {
    const response = http.get(`${baseUrl}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    check(response, {
      "profile returns 200": (result) => result.status === 200,
      "profile response contains the registered email": (result) =>
        result.json("user.email") === identity.email,
    });
  });

  sleep(1);
}

export function refreshReplayLifecycle() {
  const identity = uniqueIdentity("refresh");

  const registerResponse = registerUser(identity);
  check(registerResponse, {
    "refresh scenario register returns 201": (result) => result.status === 201,
  });

  const loginResponse = loginUser(identity);
  check(loginResponse, {
    "refresh scenario login returns 200": (result) => result.status === 200,
  });

  if (loginResponse.status !== 200) {
    return;
  }

  const refreshToken = loginResponse.json("refreshToken");

  group("refresh", () => {
    const response = http.post(
      `${baseUrl}/v1/auth/tokens/refresh`,
      JSON.stringify({ refreshToken }),
      jsonHeaders,
    );

    check(response, {
      "refresh returns 200": (result) => result.status === 200,
      "refresh rotates the token": (result) =>
        result.status === 200 && result.json("refreshToken") !== refreshToken,
    });
  });

  group("replay rejection", () => {
    const replayResponse = http.post(
      `${baseUrl}/v1/auth/tokens/refresh`,
      JSON.stringify({ refreshToken }),
      jsonHeaders,
    );

    check(replayResponse, {
      "refresh replay returns 401": (result) => result.status === 401,
      "refresh replay returns REFRESH_TOKEN_REUSED": (result) =>
        result.json("error.code") === "REFRESH_TOKEN_REUSED",
    });
  });
}

export function handleSummary(data) {
  return {
    "/scripts/results/auth-benchmark-summary.json": JSON.stringify(data, null, 2),
  };
}
