const { randomUUID } = require("node:crypto");

// Gera ou propaga o correlation id de cada requisição
module.exports = (req, res, next) => {
  const incoming = req.headers["x-correlation-id"];
  const correlationId = incoming || randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  next();
};
