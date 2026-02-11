const express = require("express");
const { health, ready } = require("../controllers/healthController.ts");

const router = express.Router();

router.get("/health", health);
router.get("/ready", ready);

module.exports = router;
