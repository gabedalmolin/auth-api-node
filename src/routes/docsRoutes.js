const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../docs/swagger");

const router = express.Router();

router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
router.get("/docs.json", (_req, res) => res.json(swaggerSpec));

module.exports = router;
