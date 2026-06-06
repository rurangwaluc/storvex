export type ApiResponse<T> = {
  data?: T;
  message?: string;
  error?: string;
};

export type ApiErrorBody = {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
};