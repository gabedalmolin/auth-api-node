const AppError = require("../errors/AppError");

module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return next(
      new AppError(message || "invalid payload", 400, "INVALID_PAYLOAD"),
    );
  }

  req.body = result.data; // payload já normalizado
  return next();
};
