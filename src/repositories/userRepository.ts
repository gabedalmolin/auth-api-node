import prisma from "../config/prisma";

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserInput) {
    return prisma.user.create({ data });
  }
}

export default new UserRepository();
