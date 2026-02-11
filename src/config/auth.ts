const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

module.exports = {
  jwt: {
    secret: jwtSecret,
    expiresIn: "1h",
  },
};
