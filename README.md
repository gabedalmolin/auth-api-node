# Auth API (Node.js)

A simple and clean authentication API built with Node.js and Express :)

This project implements a complete authentication flow using JWT, including user registration, login, protected routes and automated tests.

## 🚀 Features

- User registration
- Login with JWT authentication
- Protected routes using middleware
- Stateless authentication
- Automated tests with Jest and Supertest

## 🛠️ Tech Stack

- Node.js
- Express
- JSON Web Token (JWT)
- bcryptjs
- Jest
- Supertest

## 📦 Installation

npm install

## ▶️ Running the project

npm run dev

## 🧪 Running tests

npm test

## 🔐 API Endpoints

Authentication:

- POST /auth/register
- POST /auth/login
- GET /auth/profile (protected)

Users:

- GET /users/me (protected)

## 📌 Notes

This project was built as a learning-focused backend authentication system, following good practices such as separation of concerns and automated testing.
