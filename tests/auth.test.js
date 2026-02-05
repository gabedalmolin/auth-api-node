const request = require("supertest");
const app = require("../src/app");

// 1 test
describe("Auth flow", () => {
  it("should register a new user", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "John",
      email: "john@test.com",
      password: "123456",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("email", "john@test.com");
    expect(response.body).not.toHaveProperty("password");
  });
});

// 2 test
it("should authenticate and return a token", async () => {
  const response = await request(app).post("/auth/login").send({
    email: "john@test.com",
    password: "123456",
  });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("token");
});

// 3 test
it("should access protected route with valid token", async () => {
    const loginResponse = await request(app)
    .post("/auth/login")
    .send({
        email: "john@test.com",
        password: "123456",
    });

    const token = loginResponse.body.token;

    const response = await request(app)
    .get("/users/me")
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("userId");
})