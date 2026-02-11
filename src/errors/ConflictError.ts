const AppError = require("./AppError.ts");

class ConflictError extends AppError {
  constructor(message = "conflict") {
    super(message, 409);
  }
}

module.exports = ConflictError;
