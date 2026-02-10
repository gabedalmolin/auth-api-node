const prisma = require("../config/prisma");

async function health(_req, res) {
  return res.status(200).json({
    status: "ok",
    service: "auth-api",
    timestamp: new Date().toISOString(),
  });
}

async function ready(_req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: "ready",
      service: "auth-api",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: "not_ready",
      service: "auth-api",
      database: "down",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { health, ready };
