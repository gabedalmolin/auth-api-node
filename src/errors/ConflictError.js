const AppError = require("./AppError");

class ConflictError extends AppError {
  constructor(message = "conflict") {
    super(message, 409);
  }
}

module.exports = ConflictError;
