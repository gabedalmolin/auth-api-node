const jwt = require("jsonwebtoken");
const authMiddleware = require("../../src/middlewares/authMiddleware");
const authConfig = require("../../src/config/auth.ts");

describe("Auth Middleware", () => {
  const mockRes = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  };

  it("deve bloquear requisição sem token", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve bloquear token inválido", () => {
    const req = {
      headers: { authorization: "Bearer tokeninvalido" },
    };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve permitir token válido", () => {
    const token = jwt.sign({ id: 1 }, authConfig.jwt.secret);

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
