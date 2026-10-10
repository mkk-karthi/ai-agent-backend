export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;
  public readonly code?: string;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);

    this.name = "ApiError";
    this.code = code ?? "API_ERROR";
    this.status = status;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
