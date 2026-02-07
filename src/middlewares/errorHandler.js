const AppError = require("../errors/AppError");

module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || "APP_ERROR",
    });
  }

  if (process.env.NODE_ENV != "test") {
    console.error(err);
  }

  return res.status(500).json({
    error: "internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
};
