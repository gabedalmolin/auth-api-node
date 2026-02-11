const errorHandler = require("../../src/middlewares/errorHandler.ts");
const AppError = require("../../src/errors/AppError.ts");

const createRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe("errorHandler middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("retorna status/code do AppError", () => {
    const res = createRes();

    errorHandler(new AppError("invalid payload", 422, "INVALID_PAYLOAD"), {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: "invalid payload",
      code: "INVALID_PAYLOAD",
    });
  });

  it("retorna 500 para erro genérico sem log no ambiente de teste", () => {
    process.env.NODE_ENV = "test";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = createRes();

    errorHandler(new Error("boom"), {}, res, vi.fn());

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("loga erro genérico fora do ambiente de teste", () => {
    process.env.NODE_ENV = "production";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = createRes();

    errorHandler(new Error("boom"), {}, res, vi.fn());

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
