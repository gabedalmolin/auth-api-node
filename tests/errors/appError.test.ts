const AppError = require("../../src/errors/AppError.ts");
const BadRequestError = require("../../src/errors/BadRequestError.ts");
const ConflictError = require("../../src/errors/ConflictError.ts");
const UnauthorizedError = require("../../src/errors/UnauthorizedError.ts");

describe("Error classes", () => {
  it("AppError aplica valores default", () => {
    const err = new AppError("something went wrong");

    expect(err.message).toBe("something went wrong");
    expect(err.name).toBe("AppError");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("APP_ERROR");
  });

  it("BadRequestError usa status 400", () => {
    const err = new BadRequestError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("bad request");
  });

  it("ConflictError usa status 409", () => {
    const err = new ConflictError("already exists");

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("already exists");
  });

  it("ConflictError usa mensagem default", () => {
    const err = new ConflictError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("conflict");
  });

  it("UnauthorizedError usa status 401", () => {
    const err = new UnauthorizedError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("unauthorized");
  });
});
