const express = require("express");
const request = require("supertest");

describe("docsRoutes", () => {
  const createApp = () => {
    jest.resetModules();
    const router = require("../../src/routes/docsRoutes.ts");
    const app = express();
    app.use(router);
    return app;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("GET /docs.json retorna spec OpenAPI", async () => {
    const app = createApp();

    const res = await request(app).get("/docs.json");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("openapi");
    expect(res.body).toHaveProperty("info");
  });

  it("GET /docs responde com Swagger UI", async () => {
    const app = createApp();

    const res = await request(app).get("/docs").redirects(1);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Swagger UI");
  });

  it("GET /docs.json duas vezes cobre cache de spec", async () => {
    const app = createApp();

    const first = await request(app).get("/docs.json");
    const second = await request(app).get("/docs.json");

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});
