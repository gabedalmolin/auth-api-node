const express = require("express");
const swaggerUi = require("swagger-ui-express");

const router = express.Router();

let cachedSwaggerSpec = null;
const getSwaggerSpec = () => {
  if (!cachedSwaggerSpec) {
    cachedSwaggerSpec = require("../docs/swagger.ts");
  }
  return cachedSwaggerSpec;
};

router.use("/docs", swaggerUi.serve, (req, res, next) => {
  return swaggerUi.setup(getSwaggerSpec())(req, res, next);
});

router.get("/docs.json", (_req, res) => res.json(getSwaggerSpec()));

module.exports = router;
