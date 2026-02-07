const AppError = require("./AppError");

class BadRequestError extends AppError {
  constructor(message = "bad request") {
    super(message, 400);
  }
}

module.exports = BadRequestError;
