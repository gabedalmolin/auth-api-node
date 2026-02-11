const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware.ts");

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  req.log.info({ userId: req.userId }, "user me fetched");
  return res.json({
    message: "you are authenticated",
    userId: req.userId,
  });
});

module.exports = router;
