const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users } = require("../models/userModel");
const authConfig = require("../config/auth");

// register function
async function register(req, res) {
  const { name, email, password } = req.body;

  const userExists = users.find((u) => u.email === email);
  if (userExists) {
    return res.status(400).json({ error: "user already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const user = {
    id: users.length + 1,
    name,
    email,
    password: hashedPassword,
  };

  users.push(user);

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

// login function
async function login(req, res) {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ error: "user not found" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "invalid password" });
  }

  const token = jwt.sign({ id: user.id }, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
  });
  return res.json({ token });
}

module.exports = { register, login };
