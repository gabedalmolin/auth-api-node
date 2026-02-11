const request = require("supertest");
const app = require("../src/app.ts");

describe("Health endpoints", () => {
  it("GET /health should return 200", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("service", "auth-api");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("GET /ready should return 200 when database is up", async () => {
    const res = await request(app).get("/ready");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ready");
    expect(res.body).toHaveProperty("database", "up");
    expect(res.body).toHaveProperty("timestamp");
  });
});
