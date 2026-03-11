export type AppErrorDetail = {
  path: string;
  message: string;
};

type AppErrorOptions = {
  message: string;
  code: string;
  statusCode: number;
  details?: AppErrorDetail[];
};

export default class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: AppErrorDetail[] | undefined;

  constructor({ message, code, statusCode, details }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
