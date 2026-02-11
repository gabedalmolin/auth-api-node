const baseLogger = require("../logger.ts");

module.exports = (req, res, next) => {
  const logger = baseLogger.child({ correlationId: req.correlationId });
  req.log = logger;

  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      "http_request",
    );
  });

  next();
};
