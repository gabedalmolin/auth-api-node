const AppError = require("./AppError.ts");

class UnauthorizedError extends AppError {
  constructor(message = "unauthorized") {
    super(message, 401);
  }
}

module.exports = UnauthorizedError;
