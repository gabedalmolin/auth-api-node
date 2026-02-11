const AppError = require("./AppError.ts");

class BadRequestError extends AppError {
  constructor(message = "bad request") {
    super(message, 400);
  }
}

module.exports = BadRequestError;
