export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(options: {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isSubscriptionBlockedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "SUBSCRIPTION_REQUIRED" ||
      error.code === "SUBSCRIPTION_READ_ONLY" ||
      error.status === 402 ||
      error.status === 403)
  );
}