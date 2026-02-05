const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  return res.json({
    message: "you are authenticated",
    userId: req.userId,
  });
});

module.exports = router;
