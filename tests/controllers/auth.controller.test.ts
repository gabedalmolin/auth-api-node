jest.mock("../../src/services/authService.ts", () => ({
  register: vi.fn(),
  login: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  listSessions: vi.fn(),
  logoutSession: vi.fn(),
  logoutAll: vi.fn(),
}));

const authService = require("../../src/services/authService.ts");
const authController = require("../../src/controllers/authController.ts");

const createRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register retorna 400 quando faltam campos", async () => {
    const req = { body: { email: "john@test.com" } };
    const res = createRes();
    const next = vi.fn();

    await authController.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "missing required fields" });
    expect(next).not.toHaveBeenCalled();
  });

  it("login retorna 400 quando faltam campos", async () => {
    const req = { body: { email: "john@test.com" } };
    const res = createRes();
    const next = vi.fn();

    await authController.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "missing required fields" });
    expect(next).not.toHaveBeenCalled();
  });

  it("refresh retorna 400 quando refreshToken não é enviado", async () => {
    const req = { body: {} };
    const res = createRes();
    const next = vi.fn();

    await authController.refresh(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "refresh token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("logout retorna 400 quando refreshToken não é enviado", async () => {
    const req = { body: {} };
    const res = createRes();
    const next = vi.fn();

    await authController.logout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "refresh token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("sessions encaminha erro no next quando service falha", async () => {
    const err = new Error("service failure");
    authService.listSessions.mockRejectedValue(err);

    const req = { userId: 1 };
    const res = createRes();
    const next = vi.fn();

    await authController.sessions(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it("logoutSession encaminha erro no next quando service falha", async () => {
    const err = new Error("service failure");
    authService.logoutSession.mockRejectedValue(err);

    const req = { userId: 1, body: { jti: "jti-1" } };
    const res = createRes();
    const next = vi.fn();

    await authController.logoutSession(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it("logoutAll encaminha erro no next quando service falha", async () => {
    const err = new Error("service failure");
    authService.logoutAll.mockRejectedValue(err);

    const req = { userId: 1 };
    const res = createRes();
    const next = vi.fn();

    await authController.logoutAll(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
