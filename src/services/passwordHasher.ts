import bcrypt from "bcryptjs";
import { env } from "../config/env";

class PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}

export default new PasswordHasher();
