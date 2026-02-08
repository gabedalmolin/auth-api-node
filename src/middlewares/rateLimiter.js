const AppError = require("../errors/AppError");

// Rate limiter simples em memória (por IP) para rotas de auth.
// Limite alto o suficiente para testes, mas demonstra a preocupação com abuso.
const windowMs = 60 * 1000; // 1 minuto
const maxRequests = 100;

const buckets = new Map();

module.exports = (req, res, next) => {
  const key = req.ip || "global";
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, expiresAt: now + windowMs };

  if (now > bucket.expiresAt) {
    bucket.count = 0;
    bucket.expiresAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > maxRequests) {
    return next(new AppError("too many requests", 429, "TOO_MANY_REQUESTS"));
  }

  return next();
};
