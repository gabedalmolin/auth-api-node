/**
 * Testes completos de autenticação e rotas protegidas
 *
 * Cobertura:
 * - Register
 * - Login (válido e inválido)
 * - Refresh token (válido e inválido)
 * - Logout
 * - Rotas protegidas (/auth/profile e /users/me)
 * - Acesso sem token e com token inválido
 */

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../src/app.ts");
const prisma = require("../src/config/prisma");
const authConfig = require("../src/config/auth");

//  Limpa o banco antes de CADA teste
beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

//  Tokens usados nos testes
let accessToken: string;
let refreshToken: string;

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
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

      const res = await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("error");
    });

    it("não deve permitir registrar com email já existente em caixa diferente", async () => {
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

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
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });
    });

    it("deve fazer login válido e retornar tokens", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
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
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

      const loginRes = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });

      accessToken = loginRes.body.token;
      refreshToken = loginRes.body.refreshToken;
    });

    it("deve gerar novo access token com refresh token válido", async () => {
      const res = await request(app).post("/auth/refresh").send({
        refreshToken,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
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
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

      const loginRes = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });

      accessToken = loginRes.body.token;
    });

    it("deve acessar /auth/profile com token válido", async () => {
      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });

    it("deve acessar /users/me com token válido", async () => {
      const res = await request(app).get("/users/me").set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("userId");
    });

    it("não deve permitir acesso sem token", async () => {
      const res = await request(app).get("/auth/profile");

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("não deve permitir acesso com token inválido", async () => {
      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer tokeninvalido");

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ========== 5. SESSION MANAGEMENT ==========
  describe("Session management", () => {
    beforeEach(async () => {
      const email = `john+sessions-${Date.now()}@test.com`;

      await request(app).post("/auth/register").send({
        name: "John",
        email,
        password: "123456",
      });

      const login1 = await request(app).post("/auth/login").send({
        email,
        password: "123456",
      });

      accessToken = login1.body.token;

      await request(app).post("/auth/login").send({
        email,
        password: "123456",
      });
    });

    it("deve listar sessões ativas do usuário autenticado", async () => {
      const res = await request(app)
        .get("/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
      expect(res.body.sessions[0]).toHaveProperty("jti");
    });

    it("deve revogar uma sessão específica por jti", async () => {
      const listBefore = await request(app)
        .get("/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      const targetJti = listBefore.body.sessions[0].jti;

      const revokeRes = await request(app)
        .post("/auth/logout-session")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ jti: targetJti });

      expect(revokeRes.statusCode).toBe(200);
      expect(revokeRes.body).toHaveProperty("revokedSessions", 1);

      const listAfter = await request(app)
        .get("/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      const jtis = listAfter.body.sessions.map((s) => s.jti);
      expect(jtis).not.toContain(targetJti);
    });

    it("deve revogar todas as sessões do usuário", async () => {
      const revokeAllRes = await request(app)
        .post("/auth/logout-all")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});

      expect(revokeAllRes.statusCode).toBe(200);
      expect(revokeAllRes.body).toHaveProperty("revokedSessions");

      const listAfter = await request(app)
        .get("/auth/sessions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(listAfter.statusCode).toBe(200);
      expect(listAfter.body.sessions).toHaveLength(0);
    });
  });

  // ========== 6. LOGOUT ==========
  describe("Logout", () => {
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        name: "John",
        email: "john@test.com",
        password: "123456",
      });

      const loginRes = await request(app).post("/auth/login").send({
        email: "john@test.com",
        password: "123456",
      });

      refreshToken = loginRes.body.refreshToken;
    });

    it("deve fazer logout e invalidar refresh token", async () => {
      const res = await request(app).post("/auth/logout").send({
        refreshToken,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
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

// Fecha conexão do Prisma (evita warning do Jest)
afterAll(async () => {
  await prisma.$disconnect();
});
