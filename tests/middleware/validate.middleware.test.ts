const validate = require("../../src/middlewares/validate.ts");

describe("validate middleware", () => {
  it("segue com payload normalizado quando schema é válido", () => {
    const req = { body: { email: "TEST@MAIL.COM" } };
    const next = vi.fn();

    const schema = {
      safeParse: vi.fn(() => ({
        success: true,
        data: { email: "test@mail.com" },
      })),
    };

    validate(schema)(req, {}, next);

    expect(req.body).toEqual({ email: "test@mail.com" });
    expect(next).toHaveBeenCalledWith();
  });

  it("retorna INVALID_PAYLOAD com mensagens agregadas", () => {
    const req = { body: { email: "" } };
    const next = vi.fn();

    const schema = {
      safeParse: vi.fn(() => ({
        success: false,
        error: { issues: [{ message: "email inválido" }, { message: "senha curta" }] },
      })),
    };

    validate(schema)(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toBe("email inválido; senha curta");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it('usa fallback "invalid payload" quando não há issues', () => {
    const req = { body: {} };
    const next = vi.fn();

    const schema = {
      safeParse: vi.fn(() => ({
        success: false,
        error: { issues: [] },
      })),
    };

    validate(schema)(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toBe("invalid payload");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("INVALID_PAYLOAD");
  });
});
