import type { Logger } from "pino";

declare global {
  namespace Express {
    interface AuthContext {
      userId: number;
      sessionId: string;
      tokenJti: string;
    }

    interface Request {
      correlationId: string;
      log: Logger;
      auth: AuthContext;
    }
  }
}
