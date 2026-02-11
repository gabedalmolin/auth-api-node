const prisma = require("../config/prisma.ts");

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data) {
    return prisma.user.create({ data });
  }
}

module.exports = new UserRepository();
