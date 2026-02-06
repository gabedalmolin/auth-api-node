/**
 * Testes completos de autenticação e rotas protegidas
 * - Register
 * - Login (válido e inválido)
 * - Refresh token (válido e inválido)
 * - Logout
 * - Rotas protegidas /auth/profile e /users/me
 * - Acesso sem token
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const authConfig = require("../src/config/auth");

// Tokens globais para fluxo de autenticação
let refreshToken;
let accessToken;

describe("Auth API - Testes completos", () => {
  // ========== 1. REGISTER ==========
  describe("Register", () => {
    it("deve registrar um novo usuário e retornar dados sem senha", async () => {
      const res = await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("name", "John");
      expect(res.body).toHaveProperty("email", "john@test.com");
      expect(res.body).not.toHaveProperty("password");
    });
    it("não deve permitir registrar sem campos obrigatórios", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "semnome@test.com",
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir registrar com email já existente", async () => {
      const res = await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir registrar com email já existente em caixa diferente", async () => {
      const res = await request(app).post("/auth/register").send({
        name: "John",
        email: "John@Test.com",
        password: "123456",
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ========== 2. LOGIN ==========
  describe("Login", () => {
    it("deve fazer login válido e retornar tokens", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
      accessToken = res.body.token;
      refreshToken = res.body.refreshToken;
    });
    it("não deve permitir login sem payload", async () => {
      const res = await request(app).post("/auth/login").send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir login com senha inválida", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "senhaerrada",
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir login com email inexistente", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "naoexiste@test.com",
        password: "qualquer",
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ========== 3. REFRESH TOKEN ==========
  describe("Refresh Token", () => {
    it("deve gerar novo access token com refresh token válido", async () => {
      const res = await request(app).post("/auth/refresh").send({
        refreshToken,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      // Atualiza o accessToken para os próximos testes
      accessToken = res.body.token;
    });
    it("não deve aceitar refresh token inválido", async () => {
      const res = await request(app).post("/auth/refresh").send({
        refreshToken: "tokeninvalido",
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve aceitar refresh token expirado", async () => {
      const expiredRefresh = jwt.sign({ id: 999 }, authConfig.jwt.secret, {
        expiresIn: -1,
      });

      const res = await request(app).post("/auth/refresh").send({
        refreshToken: expiredRefresh,
      });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve aceitar refresh token ausente", async () => {
      const res = await request(app).post("/auth/refresh").send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ========== 4. ROTAS PROTEGIDAS ==========
  describe("Rotas protegidas", () => {
    // /auth/profile
    it("deve acessar /auth/profile com access token válido", async () => {
      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });
    // /users/me
    it("deve acessar /users/me com access token válido", async () => {
      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${accessToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userId");
    });
    // Acesso sem token
    it("não deve permitir acesso a /auth/profile sem token", async () => {
      const res = await request(app).get("/auth/profile");
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir acesso a /users/me sem token", async () => {
      const res = await request(app).get("/users/me");
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    // Acesso com token inválido
    it("não deve permitir acesso a rota protegida com token inválido", async () => {
      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer tokeninvalido");
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir acesso com Authorization malformado", async () => {
      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer");
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir acesso com token expirado", async () => {
      const expiredToken = jwt.sign({ id: 999 }, authConfig.jwt.secret, {
        expiresIn: -1,
      });

      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("deve isolar acesso entre usuários diferentes", async () => {
      const registerRes = await request(app).post("/auth/register").send({
        name: "Jane",
        email: "jane@test.com",
        password: "123456",
      });
      expect(registerRes.statusCode).toBe(201);

      const loginRes = await request(app).post("/auth/login").send({
        email: "jane@test.com",
        password: "123456",
      });
      expect(loginRes.statusCode).toBe(200);

      const tokenJane = loginRes.body.token;
      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${tokenJane}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userId");
      expect(res.body.userId).not.toBe(1);
    });
  });

  // ========== 5. LOGOUT ==========
  describe("Logout", () => {
    it("deve fazer logout e invalidar refresh token", async () => {
      const res = await request(app).post("/auth/logout").send({
        refreshToken,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });
    it("não deve permitir logout sem refresh token", async () => {
      const res = await request(app).post("/auth/logout").send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("não deve permitir refresh com token já invalidado", async () => {
      const loginRes = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });
      expect(loginRes.statusCode).toBe(200);
      const refreshTokenToInvalidate = loginRes.body.refreshToken;

      const logoutRes = await request(app).post("/auth/logout").send({
        refreshToken: refreshTokenToInvalidate,
      });
      expect(logoutRes.statusCode).toBe(200);

      const res = await request(app).post("/auth/refresh").send({
        refreshToken: refreshTokenToInvalidate,
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
    it("logout com refresh token inválido retorna erro", async () => {
      const res = await request(app).post("/auth/logout").send({
        refreshToken: "tokeninvalido",
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});
